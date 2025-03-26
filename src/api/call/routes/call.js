module.exports = {
  routes: [
    {
      method: "POST",
      path: "/call/generateCallToken",
      handler: "call.generateCallToken",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/calls/history/:userId",
      handler: "call.getUserCallHistory",
      config: {
        auth: false, // Set to true if authentication is required
      },
    },
  ],
};
