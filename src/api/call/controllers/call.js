"use strict";
const Agora = require("agora-access-token");

module.exports = {
    async generateCallToken(ctx) {
        const { channelName, uid, callType } = ctx.request.body;
        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;
        const expirationTime = Math.floor(Date.now() / 1000) + 3600;

        if (!channelName || !uid || !callType) {
            return ctx.badRequest("Missing required parameters.");
        }

        const token = Agora.RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            Agora.RtcRole.PUBLISHER,
            expirationTime
        );

        const call = await strapi.entityService.create("api::call.call", {
            data: {
                channelName,
                uid,
                callType,
                startTime: new Date(),
                status: "ongoing",
            },
        });

        return ctx.send({ token, channelName, uid, callId: call.id });
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
    
        if (!call.startTime) {
            return ctx.badRequest("Call start time is missing.");
        }
    
        const endTime = new Date();
        const startTime = new Date(call.startTime); // Ensure it's a Date object
    
        if (isNaN(startTime.getTime())) {
            return ctx.badRequest("Invalid call start time.");
        }
    
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // Convert to seconds
    
        const ratePerMinute = 10; // Example: Define your per-minute charge
        const totalCost = Math.ceil(duration / 60) * ratePerMinute;
    
        await strapi.entityService.update("api::call.call", callId, {
            data: { endTime, duration, totalCost, status: "completed" },
        });
    
        return ctx.send({ message: "Call ended successfully", totalCost, duration });
    }
    
};
