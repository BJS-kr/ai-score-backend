import { Module } from '@nestjs/common';
import { CronReviewConsumer } from './queue/consumers/cron.review.consumer';
import { StatisticsService } from './statistics/statistics.service';
import { CronReviewProducer } from './queue/producers/cron.review.producer';

const cronServices = [
  StatisticsService,
  CronReviewProducer,
  CronReviewConsumer,
];

@Module({
  providers: cronServices,
  exports: cronServices,
})
export class ScoreCronModule {}
