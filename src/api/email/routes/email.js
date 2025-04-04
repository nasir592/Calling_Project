'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/send-custom-email',
      handler: 'email.sendCustomEmail',
      config: {
        policies: [],
        auth: false, // set to true if you want to require auth
      },
    },
  ],
};
