'use strict';

/**
 * app-config service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::app-config.app-config');
