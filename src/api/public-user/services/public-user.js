'use strict';

/**
 * public-user service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::public-user.public-user');
