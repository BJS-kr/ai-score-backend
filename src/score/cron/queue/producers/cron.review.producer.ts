import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { JOB_NAME } from '../job.constants';

@Injectable()
export class CronReviewProducer {
  constructor(
    @InjectQueue(JOB_NAME.CRON_REVIEW) private readonly cronReviewQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRetryFailedReviews() {}
}
