module.exports = {
    routes: [
      {
        method: "POST",
        path: "/calls/endCall",
        handler: "call.endCall",
        config: {
          auth: false, // Set to true if authentication is needed
        },
      },
    ],
  };
  