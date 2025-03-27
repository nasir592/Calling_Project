"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const Agora = require("agora-access-token"); 
module.exports = createCoreController("api::call.call", ({ strapi }) => ({
    async generateCallToken(ctx) {
        try {
          const { uid, role, callerId, receiverId,type } = ctx.request.body;
          const appId = process.env.AGORA_APP_ID;
          const appCertificate = process.env.AGORA_APP_CERTIFICATE;
          const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    
          if (!appId || !appCertificate) {
            return ctx.badRequest("Agora App ID or Certificate is missing.");
          }
    
          // ✅ Validate input
          if (!uid || !callerId || !receiverId || !type) {
            return ctx.badRequest("Missing required parameters: uid, callerId, or receiverId.");
          }
    
          // ✅ Ensure IDs are numbers
          if (isNaN(callerId) || isNaN(receiverId)) {
            return ctx.badRequest("callerId and receiverId must be valid numbers.");
          }
          if (callerId === receiverId) {
            return ctx.badRequest("callerId and receiverId must be different.");
          }
    
          // ✅ Validate if caller and receiver exist
          const caller = await strapi.entityService.findOne("api::public-user.public-user", callerId);
          const receiver = await strapi.entityService.findOne("api::public-user.public-user", receiverId);
    
          if (!caller || !receiver) {
            return ctx.notFound("Caller or Receiver not found in the database.");
          }
    
          // ✅ Generate a unique channel name
          const channelName = `call_${callerId}_${receiverId}_${Date.now()}`;
    
          // ✅ Generate Agora token
          const token = Agora.RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            role,
            expirationTime
          );
    
          // ✅ Save call details in Strapi
          const call = await strapi.entityService.create("api::call.call", {
            data: {
              channelName,
              type: type,
              startTime: new Date(),
              callStatus: "ongoing",
              caller: callerId,
              receiver: receiverId,
              
            },
          });
    
          return ctx.send({ token, channelName, uid, call });
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

      console.log(call);
      
      if (call.callStatus !== "ongoing") {
        return ctx.badRequest("Call is not ongoing or already ended.");
      }

      // Calculate call duration
      const endTime = new Date();
      const startTime = new Date(call.startTime);
      const duration = Math.ceil((endTime - startTime) / 60000); // Convert ms to minutes, round up

      call.caller.id = 29;
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

      // Calculate total cost
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
