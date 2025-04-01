module.exports = {
  async afterCreate(event) { await updateExpertRating(event.result.expert.id); },
  async afterUpdate(event) { await updateExpertRating(event.result.expert.id); },
  async afterDelete(event) { await updateExpertRating(event.result.expert.id); }
};

const updateExpertRating = async (expertId) => {
  // 1. Get all reviews for this expert
  const reviews = await strapi.entityService.findMany('api::review.review', {
    filters: { expert: expertId },
    fields: ['rating']
  });

  // 2. Calculate average and count
  const count = reviews.length;
  const average = count > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / count
    : 0;

  // 3. Update expert's RatingSummary component
  await strapi.entityService.update('api::expert.expert', expertId, {
    data: {
      ratingSummary: {  // Your component field name
        average: parseFloat(average.toFixed(1)), // Round to 1 decimal
        count: count
      }
    }
  });
};