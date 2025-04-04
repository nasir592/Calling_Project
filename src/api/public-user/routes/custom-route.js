module.exports = {
    routes: [
      {
        method: 'GET',
        path: '/public-users/:id/qr',
        handler: 'public-user.generateQRForUser',
        config: {
          auth: false // Set to true if authentication is required
        }
      }
    ]
  };
  