'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const axios = require("axios");
const jwt = require("jsonwebtoken");
const jwtSecret = "JWT_SECRET";




module.exports = createCoreController("api::otp.otp", ({ strapi }) => ({
  async sendOtp(ctx) {

try {
    

    
    const settings = await strapi.entityService.findMany("api::app-config.app-config", 1);

if (!settings || !settings.Template_Id || !settings.Msg_Auth_Key) {
    return ctx.badRequest({ message: "Missing configuration settings." });
}



    const templateId = settings.Template_Id;
   const MSG91_AUTH_KEY = settings.Msg_Auth_Key;

    const { mobile } = ctx.request.body;
    if (!mobile) return ctx.badRequest({ message: "Mobile number is required" });

   const otp = Math.floor(1000 + Math.random() * 9000);

    const expiresAt = new Date(Date.now() + 10 * 60000); 

    
    // ✅ Delete old OTP if exists
    await strapi.query("api::otp.otp").delete({ where: { mobile } });

    // ✅ Store new OTP in the database
    await strapi.query("api::otp.otp").create({
      data: { mobile, otp, expiresAt },
    });

    // ✅ Send OTP via MSG91
    await axios.post("https://control.msg91.com/api/v5/flow/", {
      authkey: MSG91_AUTH_KEY,
      template_id: templateId,
      recipients: [{ mobiles: `91${mobile}`, var: otp }],
    });

    return ctx.send({ message: "OTP sent successfully" });

} catch (error) {
    console.log(error);
    
    return ctx.send({ message: "Error sending OTP" });
}
  },


  async verifyOtp(ctx) {


    const { mobile, otp,  } = ctx.request.body; // Added name for new users

    if (!mobile || !otp) {
        return ctx.badRequest({ message: "Mobile number and OTP are required" });
    }

    // Fetch the latest OTP
    const otpRecord = await strapi.db.query("api::otp.otp").findOne({
        where: { mobile },
        orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
        return ctx.badRequest({ message: "No OTP found. Please request a new one." });
    }

    console.log(otpRecord);
    
    if (String(otpRecord.otp) !== String(otp)) {
        return ctx.badRequest({ message: "Invalid OTP" });
    }

    if (otpRecord.expireTime && new Date(otpRecord.expireTime) < new Date()) {
        return ctx.badRequest({ message: "OTP expired. Request a new one." });
    }

    // Check if user exists
    let user = await strapi.db.query("api::public-user.public-user").findOne({
      where: { mobile },
  });
    if (!user) {
        // ✅ If user does not exist, create a new one
        user = await strapi.db.query("api::public-user.public-user").create({
            data: {
              
                mobile,
            },
        });
    }

    console.log("Successfully verified OTP");
    


    const settings = await strapi.entityService.findMany("api::app-config.app-config", 1);

    if (!settings || !settings.Jwt_Secret_Key) {
        return ctx.badRequest({ message: "Missing configuration settings Jwt Secert Key." });
    }
    
        const jwtSecret = settings.Jwt_Secret_Key;

console.log(jwtSecret);


    // Generate JWT Token
    const token = jwt.sign(
        { id: user.id, mobile: user.mobile },
        jwtSecret || strapi.config.get("plugin.users-permissions.jwtSecret"),
        { expiresIn: "7d" }
    );
console.log(token);

    // Delete OTP after successful verification
    await strapi.db.query("api::otp.otp").delete({ where: { mobile } });

    
    return ctx.send({
        message: "OTP verified successfully!",
        user,
        token,
    });
}


}));
