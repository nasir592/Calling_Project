'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::expert-profile.expert-profile', ({ strapi }) => ({
  async search(ctx) {
    const { q } = ctx.request.query;

    if (!q || q.trim() === '') {
      return ctx.badRequest('Search query is required');
    }

    const keyword = q.trim();

    // First, search by category
    const categoryResults = await strapi.entityService.findMany('api::expert-profile.expert-profile', {
      filters: {
        categories: { name: { $containsi: keyword } },
      },
      populate: ['user', 'categories'],
    });

    // If no results found in category, search by handler
    if (categoryResults.length === 0) {
      const handlerResults = await strapi.entityService.findMany('api::expert-profile.expert-profile', {
        filters: {
          handler: { $containsi: keyword },
        },
        populate: ['user', 'categories'],
      });

      // If no results found in handler, search by name
      if (handlerResults.length === 0) {
        const nameResults = await strapi.entityService.findMany('api::expert-profile.expert-profile', {
          filters: {
            user: { name: { $containsi: keyword } },
          },
          populate: ['user', 'categories'],
        });

        return nameResults;
      }

      return handlerResults;
    }

    return categoryResults;
  }
}));