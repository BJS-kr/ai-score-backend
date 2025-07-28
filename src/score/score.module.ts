import { Module } from '@nestjs/common';
import { SubmissionController } from './router/submissions/submissions.controller';
import { SubmissionsReviewService } from './core/submissions/submissions.review.service';
import { AzureBlobStorageIntegration } from './IO/integrations/azure-blob-storage.integration';
import { VideoService } from './IO/video/video.service';
import { AzureOpenAIIntegration } from './IO/integrations/azure-openai.integration';
import { DbModule } from 'src/system/database/db.module';
import { Processor } from 'src/score/helper/processor/processor';
import { SubmissionRepository } from './IO/respositories/submission.respository';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ExternalCallLogRepository } from './IO/respositories/external.call.log.repository';
import { ReviewParser } from './core/submissions/submissions.review.parser';
import { SubmissionsQueryService } from './core/submissions/submissions.query.service';
import { RevisionController } from './router/revisions/revision.controller';
import { RevisionReviewService } from './core/revisions/revision.review.service';
import { RevisionRepository } from './IO/respositories/revision.repository';
import { RevisionQueryService } from './core/revisions/revision.query.service';
import { BullModule } from '@nestjs/bullmq';
import { JOB_NAME } from './cron/job.constants';

@Module({
  imports: [
    DbModule,
    MulterModule.register({
      storage: diskStorage({
        destination(req, file, callback) {
          callback(null, './uploads');
        },
        filename(req, file, callback) {
          callback(null, `${uuidv4()}-${file.originalname}`);
        },
      }),
    }),
    BullModule.registerQueue({
      configKey: 'ai-score-queue',
      name: JOB_NAME.CRON_REVIEW,
    }),
  ],
  controllers: [SubmissionController, RevisionController],
  providers: [
    /**
     * Services
     */
    /** Submission */
    SubmissionsReviewService,
    SubmissionsQueryService,
    /** Revision */
    RevisionReviewService,
    RevisionQueryService,
    /**
     * Repositories
     */
    SubmissionRepository,
    ExternalCallLogRepository,
    RevisionRepository,
    /**
     * Integrations
     */
    AzureOpenAIIntegration,
    AzureBlobStorageIntegration,
    /**
     * Logics
     */
    VideoService,
    ReviewParser,
    /**
     * Helpers
     */
    Processor,
  ],
})
export class ScoreModule {}
