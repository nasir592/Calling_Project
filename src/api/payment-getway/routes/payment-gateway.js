'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/payment-gateway/initiate',
      handler: 'payment-gateway.initiatePayment',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/payment-gateway/response',
      handler: 'payment-gateway.handleResponse',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/payment-gateway/success',
      handler: 'payment-gateway.success',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/payment-gateway/failure',
      handler: 'payment-gateway.failure',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    }
  ],
};