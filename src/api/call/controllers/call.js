"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const Agora = require("agora-access-token");
const axios = require("axios"); // For Firebase notifications
const firebase = require("../../../utils/firebase/firebase-admin")

module.exports = createCoreController("api::call.call", ({ strapi }) => ({
  async generateCallToken(ctx) {
    try {
      const {  role, callerId, receiverId, type } = ctx.request.body;

    
      
      const settings = await strapi.entityService.findMany("api::app-config.app-config", 1);

    
      
      if (!settings || !settings.Agora_App_Id || !settings.Agora_App_Certificate) {
        return ctx.badRequest({ message: "Missing configuration settings." });
      }
      

      const appId = settings.Agora_App_Id;
      const appCertificate = settings.Agora_App_Certificate;
      const firebaseKey = "AIzaSyAEPCBqd9HY5ltEqem3L_3aQ_EuMHN1UGY";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      if (!callerId || !receiverId || !type) {
        return ctx.badRequest("Missing required parameters.");
      }

      if (callerId === receiverId) {
        return ctx.badRequest("Caller and receiver cannot be the same.");
      }

      

      const caller = await strapi.entityService.findOne("api::public-user.public-user", callerId);



      const receiver = await strapi.entityService.findOne("api::expert-profile.expert-profile", receiverId, {
        fields: ['firebaseTokens']
      });
      

      console.log("receiver", receiver);
      

      if (!caller || !receiver) {
        return ctx.notFound("Caller or Receiver not found.");
      }

      // if (!receiver.firebaseToken) {
      //   return ctx.badRequest("Receiver has no Firebase token.");
      // }

      const channelName = `call_${callerId}_${receiverId}_${Date.now()}`;

      const token = Agora.RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        role,
        expirationTime
      );
    

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

    
      
      const payload = {
        notification: {
          title: "Incoming Call",
          body: `${caller.name} is calling you...`,
          //sound: "default",
        },
        data: {
          type: "videoCall",
          channelName,
          token,
          callerId: callerId.toString(),
          receiverId: receiverId.toString(),
        },
        token: receiver.firebaseTokens,
      };
      console.log("payload", payload);
      

      await firebase.messaging().send(payload);


      return ctx.send({ token, channelName, call });
    } catch (error) {
      console.error("Error generating call token:", error);
      return ctx.internalServerError("Failed to generate call token.");
    }
  },

  async endCall(ctx) {
    try {
      const { callId } = ctx.request.body;

      if (!callId) {
        return ctx.badRequest("Missing call ID.");
      }

      // Find the call entry
      const call = await strapi.entityService.findOne("api::call.call", callId, {
        populate: ["caller", "receiver"],
      });

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
      const caller = await strapi.entityService.findOne("api::public-user.public-user", call.caller.id);
      const receiver = await strapi.entityService.findOne("api::public-user.public-user", call.receiver.id);

      // Fetch per-minute rate (assuming stored in receiver profile)
      const perMinuteRate = receiver.callRate || 10; // Default rate is 10 per minute

      
      const totalCost = duration * perMinuteRate;

      if (caller.walletBalance < totalCost) {
        return ctx.badRequest("Insufficient balance.");
      }

      // Deduct balance from caller
      await strapi.entityService.update("api::public-user.public-user", call.caller.id, {
        data: {
          walletBalance: caller.walletBalance - totalCost,
        },
      });

      // Add balance to receiver (expert)
      await strapi.entityService.update("api::public-user.public-user", call.receiver.id, {
        data: {
          walletBalance: receiver.walletBalance + totalCost,
        },
      });

      // Update call details in Strapi
      const updatedCall = await strapi.entityService.update("api::call.call", callId, {
        data: {
          callStatus: "completed",
          endTime,
          duration,
          totalCost,
        },
      });

      return ctx.send({ message: "Call ended successfully.", updatedCall });
    } catch (error) {
      console.error("Error ending call:", error);
      return ctx.internalServerError("An error occurred while ending the call.");
    }
  },
}));
