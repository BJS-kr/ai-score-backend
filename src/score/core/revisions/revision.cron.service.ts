import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class RevisionCronService {
  constructor(@InjectQueue('statistics') private readonly queue: Queue) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRetryFailedReviews() {}
}
