import { Module } from '@nestjs/common';
import { SubmissionController } from './submissions/submissions.controller';
import { RevisionController } from './revisions/revision.controller';

@Module({
  controllers: [SubmissionController, RevisionController],
})
export class ScoreRouterModule {}
