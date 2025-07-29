import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAME } from '../../job.constants';
import { RevisionReviewService } from 'src/score/core/revisions/revision.review.service';
import { LogContext } from 'src/common/decorators/param/log.context';
import { v4 as uuidv4 } from 'uuid';

@Processor(JOB_NAME.CRON_REVIEW, {
  concurrency: 3,
})
export class CronReviewConsumer extends WorkerHost {
  constructor(private readonly revisionReviewService: RevisionReviewService) {
    super();
  }
  async process(job: Job<{ submissionId: string }, void>) {
    const submissionId = job.data.submissionId;

    const logContext: LogContext = {
      traceId: uuidv4(),
      requestUri: job.name,
      startTime: Date.now(),
      logInfo: {
        submissionId,
      },
    };

    await this.revisionReviewService.reviseSubmission(logContext);
  }
}

// TODO: Cron에서도 telemetry를 볼 수 있게
