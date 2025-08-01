import { Module } from '@nestjs/common';
import { SubmissionRepository } from './submission.respository';
import { ExternalCallLogRepository } from './external.call.log.repository';
import { RevisionRepository } from './revision.repository';
import { StatisticsRepository } from './statistics.repository';

const repositories = [
  SubmissionRepository,
  ExternalCallLogRepository,
  RevisionRepository,
  StatisticsRepository,
];
@Module({
  providers: repositories,
  exports: repositories,
})
export class ScoreRepositoryModule {}
