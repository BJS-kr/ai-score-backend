import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { JOB_NAME } from '../../job.constants';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';

@Injectable()
export class CronReviewProducer {
  constructor(
    @InjectQueue(JOB_NAME.CRON_REVIEW) private readonly cronReviewQueue: Queue,
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRetryFailedReviews() {
    const submissions =
      await this.submissionRepository.getFailedAndNotRetriedSubmissions();

    await this.cronReviewQueue.addBulk(
      submissions.map((submission) => ({
        name: JOB_NAME.CRON_REVIEW,
        data: { submissionId: submission.id },
      })),
    );
  }
}
