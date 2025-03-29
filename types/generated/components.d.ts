import type { Schema, Struct } from '@strapi/strapi';

export interface RateRates extends Struct.ComponentSchema {
  collectionName: 'components_rate_rates';
  info: {
    description: '';
    displayName: 'Rates';
  };
  attributes: {
    videoCallRate: Schema.Attribute.Decimal;
    voiceCallRate: Schema.Attribute.Decimal;
  };
}

export interface ReviewReviews extends Struct.ComponentSchema {
  collectionName: 'components_review_reviews';
  info: {
    displayName: 'Reviews';
  };
  attributes: {
    comments: Schema.Attribute.Text;
    name: Schema.Attribute.String;
    rating: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface ScheduleAvailability extends Struct.ComponentSchema {
  collectionName: 'components_schedule_availabilities';
  info: {
    displayName: 'availability';
  };
  attributes: {
    days: Schema.Attribute.Enumeration<
      [
        'Monday',
        'Tuesday ',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]
    >;
    endTime: Schema.Attribute.Time;
    startTime: Schema.Attribute.Time;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'rate.rates': RateRates;
      'review.reviews': ReviewReviews;
      'schedule.availability': ScheduleAvailability;
    }
  }
}
