import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAME } from '../job.constants';

@Processor(JOB_NAME.CRON_REVIEW, {
  concurrency: 3,
})
export class CronReviewConsumer implements WorkerHost {
  async process(job: Job) {
    console.log('CronReviewConsumer', job);
  }
}
