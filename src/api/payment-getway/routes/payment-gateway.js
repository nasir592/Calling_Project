'use strict';
module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payu/initiate",
      handler: "payment-gateway.initiatePayment",
      config: {
        auth: false, // Change to `true` if authentication is required
       
      },
    },
    {
      method: "POST",
      path: "/payu/success",
      handler: "payment-gateway.handlePaymentResponse",
      config: {
        auth: false, // Change to `true` if authentication is required
        
      },
    },
    {
      method: "POST",
      path: "/payu/failure",
      handler: "payment-gateway.handlePaymentResponse",
      config: {
        auth: false, // Change to `true` if authentication is required
        
      },
    },
    {
      method: "POST",
      path: "/payu/withdraw",
      handler: "payment-gateway.withdrawToBank",
      config: {
        auth: false, // Change to `true` if authentication is required
        
      },
    },
  ],
};
