module.exports = {
    routes: [
      {
        method: "POST",
        path: "/razorpay/create-order",
        handler: "razorpay.createOrder",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/razorpay/verify-payment",
        handler: "razorpay.verifyPayment",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/razorpay/withdraw-money",
        handler: "razorpay.withdrawMoney",
        config: { auth: false },
      },
    ],
  };
  