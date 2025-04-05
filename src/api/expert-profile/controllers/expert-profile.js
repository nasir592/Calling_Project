'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::expert-profile.expert-profile', ({ strapi }) => ({
  async search(ctx) {
    const { q } = ctx.request.query;

    if (!q || q.trim() === '') {
      return ctx.badRequest('Search query is required');
    }

    const keyword = q.trim();

    const results = await strapi.entityService.findMany('api::expert-profile.expert-profile', {
      filters: {
        $or: [
          { handler: { $containsi: keyword } },
          { specialization: { $containsi: keyword } },
          { user: { name: { $containsi: keyword } } },
          { categories: { name: { $containsi: keyword } } },
        ],
      },
      populate: ['user', 'categories'], // populate relations
    });

    return results;
  }
}));
