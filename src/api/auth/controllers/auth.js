const axios = require("axios");

const MSG91_AUTH_KEY = "288639AVtamNkm63a014e0P1"; // Your MSG91 API Key
const FLOW_ID = "6569ce42d6fc053ccb32e472"; // Your MSG91 Flow ID

module.exports = {
    
    async sendOtp(ctx) {
        const { mobile } = ctx.request.body;
      
        if (!mobile) {
            return ctx.badRequest({ message: "Mobile number is required" });
        }
    
        const otp = generateOTP();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 5); // OTP expires in 5 mins
    
        try {
            // ✅ Store OTP in Database
            await strapi.query("api::otp.otp").create({
                data: { mobile, otp, otpExpiry },
            });
    
            // ✅ Send OTP using MSG91
            const response = await axios.post(
                "https://control.msg91.com/api/v5/flow/",
                {
                    template_id: "YOUR_TEMPLATE_ID",
                    recipients: [{ mobiles: `91${mobile}`, var: otp }],
                },
                {
                    headers: { authkey: MSG91_AUTH_KEY },
                }
            );
    
            console.log("MSG91 OTP Send Response:", response.data);
            return ctx.send({ message: "OTP sent successfully" });
        } catch (error) {
            console.error("Error Sending OTP:", error.response?.data || error.message);
            return ctx.internalServerError({ message: "Failed to send OTP", error: error.response?.data || error.message });
        }
    },

  async verifyOtp(ctx) {
    const { mobile, otp } = ctx.request.body;

    if (!mobile || !otp) {
      return ctx.badRequest({ message: "Mobile number and OTP are required" });
    }



    try {
      // ✅ Verify OTP from MSG91
      const response = await axios.get(`https://control.msg91.com/api/v5/otp/verify`, {
        params: {
          authkey: MSG91_AUTH_KEY,
          mobile: `91${mobile}`,
          otp: otp,
        },
      });
      console.log("Verifying OTP for:", `91${mobile}`, otp);
      console.log("MSG91 OTP Verification Response:", response.data);

      if (!response.data || response.data.type !== "success") {
        return ctx.badRequest({ message: "Invalid OTP", error: response.data });
      }

    //   ✅ Find or Create User in Strapi
      let user = await strapi.query("plugin::users-permissions.user").findOne({ where: { phone: mobile } });

      if (!user) {
        user = await strapi.query("plugin::users-permissions.user").create({
          data: { phone: mobile, username: mobile, password: "otp_login" }, // Dummy password for OTP login
        });
      }

      // ✅ Generate JWT Token
      const token = jwt.sign({ id: user.id, phone: mobile }, JWT_SECRET, { expiresIn: "7d" });

      return ctx.send({
        message: "OTP verified successfully, login successful",
        user: { id: user.id, phone: mobile },
        token,
      });
    } catch (error) {
      console.error("MSG91 OTP Verification Error:", error.response?.data || error.message);
      return ctx.internalServerError({ message: "OTP verification failed", error: error.response?.data || error.message });
    }
  },
};
