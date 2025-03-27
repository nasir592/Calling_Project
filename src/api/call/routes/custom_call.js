"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/call/generateCallToken",
      handler: "call.generateCallToken",
      config: {
        auth: false, // Change to `true` if authentication is required
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/call/endCall",
      handler: "call.endCall",
      config: {
        auth: false, // Change to `true` if authentication is required
        policies: [],
      },
    },
  ],
};
