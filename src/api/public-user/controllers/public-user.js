'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const QRCode = require('qrcode');

module.exports = createCoreController('api::public-user.public-user', ({ strapi }) => ({
  
  async generateQRForUser(ctx) {
    try {
      const { id } = ctx.params; // Get user ID from request
      const user = await strapi.entityService.findOne('api::public-user.public-user', id);

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Generate QR code containing user profile link or user ID
      const qrCodeData = await QRCode.toDataURL(`https://manage.consultease.com/api/public-users/${id}`);

      return ctx.send({ qrCode: qrCodeData });
    } catch (err) {
      console.error('Error generating QR Code:', err);
      return ctx.badRequest('Failed to generate QR Code');
    }
  }

}));
