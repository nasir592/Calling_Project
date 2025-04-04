module.exports = {
  async afterCreate(event) {
    await updateExpertStats(event.result);
  },
  async afterUpdate(event) {
    await updateExpertStats(event.result);
  },
  async afterDelete(event) {
    await updateExpertStats(event.result);
  },
};

async function updateExpertStats(review) {
  try {
    console.log('\n=== STARTING EXPERT UPDATE ===');
    
    // 1. Get the FULL review with populated expert
    const fullReview = await strapi.db.query('api::review.review').findOne({
      where: { id: review.id },
      populate: {
        expert: {
          populate: true // Force deep population
        }
      }
    });

    // console.log('1. REVIEW WITH EXPERT:', {
    //   reviewId: fullReview.id,
    //   expertId: fullReview.expert?.id,
    //   expertDocId: fullReview.expert?.documentId
    // });
    

    if (!fullReview.expert) {
      console.log('❌ ABORTING: Review has no expert assigned');
      return;
    }

    // 2. Get all reviews for this expert
    const reviews = await strapi.entityService.findMany(
      'api::review.review',
      {
        filters: { expert: fullReview.expert.id },
        fields: ['rating']
      }
    );

    // console.log("all reviews", reviews);
    
    // console.log('2. FOUND REVIEWS:', reviews.length);

    // 3. Calculate stats
    const reviewCount = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviewCount > 0 
      ? parseFloat((sumRatings / reviewCount).toFixed(1))
      : 0;

    console.log('3. CALCULATED STATS:', { averageRating, reviewCount });
// console.log("expertid", fullReview.expert.id);
// console.log("reviewid", review.id);

const expert_Id = await strapi.db.query('api::review.review').findOne({
    where: { id: review.id },
    populate: {
      expert: {
        populate: true // Force deep population
      }
    }
  });

//   console.log("expertid", expert_Id);

    await strapi.entityService.update('api::expert-profile.expert-profile', expert_Id.expert.id, {
        data: {
          averageRating: averageRating,
          reviewCount: reviewCount,
        },
      });
  

    // console.log('✅ SUCCESS: Expert stats updated');
  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
  }
}