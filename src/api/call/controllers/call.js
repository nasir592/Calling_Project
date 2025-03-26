"use strict";
const Agora = require("agora-access-token");

module.exports = {
    async generateCallToken(ctx) {

      try {
        
      
        const { channelName, uid, role, type, callerId, receiverId } = ctx.request.body;
        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;
        const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    
        // ✅ Validate input parameters
        if (!channelName || !uid || !callerId || !receiverId) {
          return ctx.badRequest("Missing required parameters.");
        }
    
        // ✅ Ensure type is "voice" or "video"
        if (!type || (type !== "voice" && type !== "video")) {
          return ctx.badRequest("Invalid call type. Must be 'voice' or 'video'.");
        }
    
        // ✅ Check if caller and receiver exist
        const caller = await strapi.entityService.findOne("api::public-user.public-user", callerId);
        const receiver = await strapi.entityService.findOne("api::public-user.public-user", receiverId);
        if (!caller || !receiver) {
          return ctx.notFound("Caller or Receiver not found.");
        }
    
        // ✅ Generate Agora token good ff
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
            type,  // ✅ Ensure type is saved correctly
            start_time: new Date(),
            call_status: "ongoing",
            caller_id: callerId,
            receiver_id: receiverId
          },
        });
    
        return ctx.send({ token, channelName, uid, call });
      } catch (error) {
        console.log(error);
        return ctx.internalServerError("Error generating call token", error);
        
      }
  },

  async endCall(ctx) {
    const { callId } = ctx.request.body;
    if (!callId) {
      return ctx.badRequest("Call ID is required.");
    }

    const call = await strapi.entityService.findOne("api::call.call", callId);
    if (!call) {
      return ctx.notFound("Call not found.");
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - new Date(call.startTime)) / 1000);
    const ratePerMinute = 10;
    const totalCost = Math.ceil(duration / 60) * ratePerMinute;

    await strapi.entityService.update("api::call.call", callId, {
      data: { endTime, duration, totalCost, status: "completed" },
    });

    return ctx.send({ message: "Call ended successfully", totalCost });
  },

    async getUserCallHistory(ctx) {
      const { userId } = ctx.params;
  
      if (!userId) {
        return ctx.badRequest("User ID is required.");
      }
  
      try {
        const calls = await strapi.entityService.findMany("api::call.call", {
          filters: { caller: userId }, // Fetch calls where user is the caller
          populate: ["receiver"], // Include receiver details
          sort: { startTime: "desc" }, // Order by latest calls first
        });
  
        return ctx.send({ calls });
      } catch (error) {
        return ctx.internalServerError("Error fetching call history", error);
      }
    },
  
  
};