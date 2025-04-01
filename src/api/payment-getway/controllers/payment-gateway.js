'use strict';

const crypto = require("crypto");

module.exports = ({ strapi }) => ({
  // Initiate payment request
  async initiatePayment(ctx) {
    try {
      const { amount, userId, phone } = ctx.request.body;
      const merchantKey = "XxEwVS0s"; // Replace with your actual key
      const salt = "eBn2bReLcD"; // Replace with your actual salt
      const txnId = `TXN${Date.now()}`;
      const productInfo = "Wallet Recharge";

      // Create hash string
      const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|User|user@example.com||||||||${salt}`;
      const hash = crypto.createHash("sha512").update(hashString).digest("hex");

      const payuData = {
        key: merchantKey,
        txnid: txnId,
        amount: amount,
        productinfo: productInfo,
        firstname: "User",
        email: "user@example.com",
        phone: phone,
        surl: `${strapi.config.get('server.url')}/api/payment-gateway/success`,
        furl: `${strapi.config.get('server.url')}/api/payment-gateway/failure`,
        hash: hash,
        service_provider: "payu_paisa",
      };

      // // Store transaction in database
      // await strapi.entityService.create('api::transaction.transaction', {
      //   data: {
      //     txnId,
      //     amount,
      //     user: userId,
      //     status: 'initiated'
      //   }
      // });

      return ctx.send({ status: "success", data: payuData });
    } catch (error) {
      strapi.log.error('Payment initiation error', error);
      return ctx.badRequest("Payment initiation failed");
    }
  },

  // Handle payment response
  async handleResponse(ctx) {
    try {
      const { txnid, status, hash, amount, firstname, email, productinfo } = ctx.request.body;
      const merchantKey = "XxEwVS0s";
      const salt = "eBn2bReLcD";

      // Validate hash
      const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
      const calculatedHash = crypto.createHash("sha512").update(hashString).digest("hex");

      if (calculatedHash !== hash) {
        strapi.log.error('Hash mismatch', { received: hash, calculated: calculatedHash });
        return ctx.badRequest("Checksum validation failed");
      }

      // Update transaction status
      await strapi.entityService.update('api::transaction.transaction', txnid, {
        data: { status: status === 'success' ? 'completed' : 'failed' }
      });

      if (status === 'success') {
        // Update user wallet
        const transaction = await strapi.entityService.findOne('api::transaction.transaction', txnid);
        await strapi.entityService.update('plugin::users-permissions.user', transaction.user.id, {
          data: { wallet_balance: { $inc: amount } }
        });
      }

      return ctx.send({ status: "success", message: `Payment ${status}` });
    } catch (error) {
      strapi.log.error('Payment response error', error);
      return ctx.badRequest("Payment processing failed");
    }
  },

  // Success callback
  async success(ctx) {
    try {
      strapi.log.info('Payment success callback', ctx.request.body);
      return ctx.redirect(`${process.env.FRONTEND_URL}/payment/success?txnid=${ctx.request.body.txnid}`);
    } catch (error) {
      strapi.log.error('Success callback error', error);
      return ctx.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  },

  // Failure callback
  async failure(ctx) {
    try {
      strapi.log.warn('Payment failure callback', ctx.request.body);
      return ctx.redirect(`${process.env.FRONTEND_URL}/payment/failed?txnid=${ctx.request.body.txnid}`);
    } catch (error) {
      strapi.log.error('Failure callback error', error);
      return ctx.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  }
});