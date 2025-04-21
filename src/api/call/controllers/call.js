"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const Agora = require("agora-access-token");
const axios = require("axios"); // For Firebase notifications
const admin = require("../../../utils/firebase/firebase-admin");

module.exports = createCoreController("api::call.call", ({ strapi }) => ({
  async generateCallToken(ctx) {
    try {
      const { callerId, receiverId, type } = ctx.request.body;

      // Fetch configuration settings
      const settings = await strapi.entityService.findMany(
        "api::app-config.app-config",
        1
      );

      if (
        !settings ||
        !settings.Agora_App_Id ||
        !settings.Agora_App_Certificate
      ) {
        return ctx.badRequest({ message: "Missing configuration settings." });
      }

      const appId = settings.Agora_App_Id;
      const appCertificate = settings.Agora_App_Certificate;
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // Token expiration (1 hour)

      console.log(appCertificate);
      console.log(appId);

      // Validate request body
      if (!callerId || !receiverId || !type) {
        return ctx.badRequest("Missing required parameters.");
      }

      if (callerId === receiverId) {
        return ctx.badRequest("Caller and receiver cannot be the same.");
      }

      // Fetch caller and receiver data
      const caller = await strapi.entityService.findOne(
        "api::public-user.public-user",
        callerId
      );
      const receiver = await strapi.entityService.findOne(
        "api::public-user.public-user",
        receiverId,
        {
          fields: ["firebaseTokens"],
        }
      );

      if (!caller || !receiver) {
        return ctx.notFound("Caller or Receiver not found.");
      }

      // Generate a unique channel name for the call
      const channelName = `call_${callerId}_${receiverId}_${Date.now()}`;

      // Generate the Agora token for the caller (broadcaster role)

      console.log("CallerId", callerId);

      const role = Agora.RtcRole.PUBLISHER; // your “broadcaster” role

      const currentTs = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTs + 3600; // 1 hr

      // 1️⃣ Caller token
      const callerUid = Number(callerId);
      const callerToken = Agora.RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        callerUid,
        role,
        privilegeExpiredTs
      );

      // 2️⃣ Receiver token
      const receiverUid = Number(receiverId);
      const receiverToken = Agora.RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        receiverUid,
        role,
        privilegeExpiredTs
      );

      // Create call record, send push, then return *both* tokens:
      const call = await strapi.entityService.create("api::call.call", {
        data: {
          channelName,
          type,
          startTime: new Date(),
          callStatus: "ongoing",
          caller: callerId,
          receiver: receiverId,
        },
      });

      // … push payload …
      // in the push data, send receiverToken so the phone knows to use it:
      const payload = {
        notification: {
          title: "Incoming Call",
          body: `${caller.name} is calling…`,
        },
        data: {
          type,
          channelName,
          token: receiverToken, // ⚠️ this goes to the receiver’s device
          callerId: callerId.toString(),
          receiverId: receiverId.toString(),
        },
        token: receiver.firebaseTokens,
      };
      await admin.messaging().send(payload);

      // finally, send back both tokens if your front‑end needs them
      return ctx.send({
        channelName,
        callerToken,
        receiverToken,
        call,
        callerId,
      });
    } catch (error) {
      console.error("Error on  call:", error);
      return ctx.internalServerError(
        "An error occurred while ending the call."
      );
    }

    // Update call status to 'ended'
  },

  async endCall(ctx) {
    try {
      const { callId } = ctx.request.body;

      if (!callId) {
        return ctx.badRequest("Missing call ID.");
      }

      // Find the call entry
      const call = await strapi.entityService.findOne(
        "api::call.call",
        callId,
        {
          populate: ["caller", "receiver"],
        }
      );

      if (!call) {
        return ctx.notFound("Call not found.");
      }

      if (call.callStatus !== "ongoing") {
        return ctx.badRequest("Call is not ongoing or already ended.");
      }

      // Calculate call duration
      const endTime = new Date();
      const startTime = new Date(call.startTime);
      const duration = Math.ceil((endTime - startTime) / 60000); // Convert ms to minutes, round up

      // Fetch caller & receiver details
      const caller = await strapi.entityService.findOne(
        "api::public-user.public-user",
        call.caller.id
      );
      const receiver = await strapi.entityService.findOne(
        "api::public-user.public-user",
        call.receiver.id
      );

      // Fetch per-minute rate (assuming stored in receiver profile)
      const perMinuteRate = receiver.callRate || 10; // Default rate is 10 per minute

      const totalCost = duration * perMinuteRate;

      if (caller.walletBalance < totalCost) {
        return ctx.badRequest("Insufficient balance.");
      }

      // Deduct balance from caller
      await strapi.entityService.update(
        "api::public-user.public-user",
        call.caller.id,
        {
          data: {
            walletBalance: caller.walletBalance - totalCost,
          },
        }
      );

      // Add balance to receiver (expert)
      await strapi.entityService.update(
        "api::public-user.public-user",
        call.receiver.id,
        {
          data: {
            walletBalance: receiver.walletBalance + totalCost,
          },
        }
      );

      // Update call details in Strapi
      const updatedCall = await strapi.entityService.update(
        "api::call.call",
        callId,
        {
          data: {
            callStatus: "completed",
            endTime,
            duration,
            totalCost,
          },
        }
      );

      return ctx.send({ message: "Call ended successfully.", updatedCall });
    } catch (error) {
      console.error("Error ending call:", error);
      return ctx.internalServerError(error);
    }
  },
}));