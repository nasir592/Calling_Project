'use strict';

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/otp/send",
      handler: "otp.sendOtp",
      config: {
        policies: [],
        auth: false, // Set to true if authentication is required
      },
    },
    {
      method: "POST",
      path: "/otp/verify",
      handler: "otp.verifyOtp",
      config: {
        policies: [],
        auth: false, // Set to true if authentication is required
      },
    },
  ],
};
