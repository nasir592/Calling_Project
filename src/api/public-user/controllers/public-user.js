'use strict';

/**
 * public-user controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::public-user.public-user');
