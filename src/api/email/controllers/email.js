'use strict';
const nodemailer = require('nodemailer');

module.exports = {
  async sendCustomEmail(ctx) {
    const { to, subject, html, text } = ctx.request.body;

    if (!to || !subject || (!html && !text)) {
      return ctx.throw(400, 'Missing required email fields');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user:"malikaadi653@gmail.com",
        pass: "tvvm cbui egih puts",
      },
    });


    const settings = await strapi.entityService.findMany("api::app-config.app-config", 1);

    console.log(settings);
    
    if (!settings || !settings.Email) {
    return ctx.badRequest({ message: "Missing configuration settings ." });
      }

    const OfficialEmail = settings.Email;
    

    try {
      await transporter.sendMail({
        from: OfficialEmail,
        to,
        subject,
        text,
        html,
      });

      ctx.send({ message: 'Email sent successfully' });
    } catch (err) {
      console.error('❌ Email failed:', err);
      ctx.throw(500, 'Failed to send email');
    }
  },
};
