'use strict';
module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payu/initiate",
      handler: "payment-gateway.initiatePayment",
      config: {
        auth: false, // Change to true if authentication is required
      },
    },
    {
      method: "POST",
      path: "/payu/success",
      handler: "payment-gateway.handlePaymentResponse",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/payu/failure",
      handler: "payment-gateway.handlePaymentResponse",
      config: {
        auth: false,
      },
    },
  ],
};
