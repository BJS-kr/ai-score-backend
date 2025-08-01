import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { JOB_NAME } from '../../constants/job.constants';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { LoggerService } from 'src/common/logger/logger.service';
import { traced } from 'src/system/telemetry/traced';

@Injectable()
export class CronReviewProducer {
  constructor(
    @InjectQueue(JOB_NAME.CRON_REVIEW) private readonly cronReviewQueue: Queue,
    private readonly submissionRepository: SubmissionRepository,
    private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRetryFailedReviews() {
    await traced('cron-review', 'handleRetryFailedReviews', async () => {
      this.logger.info(`Cron: retrying one-time failed submissions...`);

      const submissions =
        await this.submissionRepository.getFailedAndNotRetriedSubmissions();

      await this.cronReviewQueue.addBulk(
        submissions.map((submission) => ({
          name: JOB_NAME.CRON_REVIEW,
          data: { submissionId: submission.id },
        })),
      );

      if (submissions.length) {
        this.logger.info(
          `Cron: successfully added ${submissions.length} submissions to the queue`,
          'CronReviewProducer',
        );
      }
    });
  }
}
