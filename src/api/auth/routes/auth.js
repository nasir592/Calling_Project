module.exports = {
    routes: [
      {
        method: "POST",
        path: "/auth/send-otp",
        handler: "auth.sendOtp",
        config: {
          auth: false, // Set to true if authentication is needed
        },
      },
      {
        method: "POST",
        path: "/auth/verify-otp",
        handler: "auth.verifyOtp",
        config: { auth: false },
      },
    ],
  };
  