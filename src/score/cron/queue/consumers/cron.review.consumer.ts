import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAME } from '../../constants/job.constants';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from 'src/common/logger/logger.service';
import { traced } from 'src/system/telemetry/traced';
import { RevisionService } from 'src/score/core/revisions/revision.service';

@Processor(JOB_NAME.CRON_REVIEW, {
  concurrency: 3,
})
export class CronReviewConsumer extends WorkerHost {
  constructor(
    private readonly revisionService: RevisionService,
    private readonly logger: LoggerService,
  ) {
    super();
  }
  async process(job: Job<{ submissionId: string }, void>) {
    await traced('cron-review', 'retry failed submission', async () => {
      this.logger.info(`Cron: processing submission ${job.data.submissionId}`);
      const submissionId = job.data.submissionId;

      const logContext: LogContext = {
        traceId: uuidv4(),
        requestUri: job.name,
        startTime: Date.now(),
        logInfo: {
          submissionId,
        },
      };

      await this.revisionService.reviseSubmission(logContext);

      this.logger.info(
        `Cron: revised by cron submission ${submissionId}`,
        'CronReviewConsumer',
      );
    });
  }
}
