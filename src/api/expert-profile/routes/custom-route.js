'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/expert-profiles/search',
      handler: 'expert-profile.search',
      config: {
        auth: false, // or true if you want to require authentication
        policies: [],
        middlewares: [],
      },
    },
  ],
};
