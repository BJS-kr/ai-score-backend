import { Module } from '@nestjs/common';
import { CronReviewConsumer } from './queue/consumers/cron.review.consumer';
import { StatisticsService } from './statistics/statistics.service';
import { CronReviewProducer } from './queue/producers/cron.review.producer';
import { ScoreRepositoryModule } from '../IO/respositories/score.repository.module';
import { BullModule } from '@nestjs/bullmq';
import { JOB_NAME } from './constants/job.constants';
import { ScoreCoreModule } from '../core/score.core.module';

const cronServices = [
  StatisticsService,
  CronReviewProducer,
  CronReviewConsumer,
];

@Module({
  imports: [
    ScoreRepositoryModule,
    ScoreCoreModule,
    BullModule.registerQueue({
      name: JOB_NAME.CRON_REVIEW,
    }),
  ],
  providers: cronServices,
  exports: cronServices,
})
export class ScoreCronModule {}
