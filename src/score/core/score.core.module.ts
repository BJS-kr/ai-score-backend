import { Module } from '@nestjs/common';
import { MediaService } from './media/media.service';
import { ReviewService } from './reviews/review.service';
import { ReviewParserService } from './reviews/review.parser.service';
import { RevisionService } from './revisions/revision.service';
import { RevisionQueryService } from './revisions/revision.query.service';
import { SubmissionsService } from './submissions/submissions.service';
import { SubmissionsQueryService } from './submissions/submissions.query.service';

const coreServices = [
  MediaService,
  ReviewService,
  ReviewParserService,
  RevisionService,
  RevisionQueryService,
  SubmissionsService,
  SubmissionsQueryService,
];

@Module({
  providers: coreServices,
  exports: coreServices,
})
export class ScoreCoreModule {}
