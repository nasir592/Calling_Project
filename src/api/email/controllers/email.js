'use strict';
const nodemailer = require('nodemailer');
const parseTemplate = require('../../../utils/parseTemplate');

module.exports = {
  async sendCustomEmail(ctx) {
    const { to, subject, html , data } = ctx.request.body;

    if (!to || !subject || (!html )) {
      return ctx.throw(400, 'Missing required email fields');
    }

    const settings = await strapi.entityService.findMany("api::app-config.app-config", 1);
    
    if (!settings || !settings.Email || !settings.EmailPass) {
    return ctx.badRequest({ message: "Missing configuration settings ." });
      }

    const OfficialEmail = settings.Email;
    const Password = settings.EmailPass;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user:OfficialEmail,
        pass:Password,
      },
    });

    const parsedHtml = parseTemplate(html, data);

   
    

    try {
      await transporter.sendMail({
        from: OfficialEmail,
        to,
        subject,
        html: parsedHtml,
      });

      ctx.send({ message: 'Email sent successfully' });
    } catch (err) {
      console.error('❌ Email failed:', err);
      ctx.throw(500, 'Failed to send email');
    }
  },
};
