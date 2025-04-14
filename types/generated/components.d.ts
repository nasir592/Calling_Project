import type { Schema, Struct } from '@strapi/strapi';

export interface ExpertDurationDuration extends Struct.ComponentSchema {
  collectionName: 'components_expert_duration_durations';
  info: {
    displayName: 'Duration';
  };
  attributes: {
    TotalCalls: Schema.Attribute.BigInteger;
    TotalMin: Schema.Attribute.Decimal;
  };
}

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

export interface SharedRating extends Struct.ComponentSchema {
  collectionName: 'components_shared_ratings';
  info: {
    description: '';
    displayName: 'RatingSummary';
  };
  attributes: {
    average: Schema.Attribute.Float & Schema.Attribute.DefaultTo<0>;
    count: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'expert-duration.duration': ExpertDurationDuration;
      'rate.rates': RateRates;
      'schedule.availability': ScheduleAvailability;
      'shared.rating': SharedRating;
    }
  }
}
