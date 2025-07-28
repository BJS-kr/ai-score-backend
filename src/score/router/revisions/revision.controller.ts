import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RevisionReviewService } from 'src/score/core/revisions/revision.review.service';
import { SubmissionResponseDto } from '../submissions/dto/response/submission.response.dto';
import { RevisionRequestDto } from './dto/request/revision.request.dto';
import Combined from 'src/common/decorators/api';
import Custom from 'src/common/decorators/param';
import { LogContext } from 'src/common/decorators/param/log.context';
import { Pagination } from 'src/common/decorators/param/pagination';
import { RevisionQueryService } from 'src/score/core/revisions/revision.query.service';
import { RevisionResponseDto } from './dto/response/revision.response.dto';

@Controller('revision')
@ApiTags('Revision')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class RevisionController {
  constructor(
    private readonly revisionReviewService: RevisionReviewService,
    private readonly revisionQueryService: RevisionQueryService,
  ) {}

  @Post()
  @Combined.AlwaysOk({
    description: 'Revision result',
    type: SubmissionResponseDto,
  })
  async createRevision(
    @Body() { submissionId }: RevisionRequestDto,
    @Custom.LogContext() logContext: LogContext,
  ) {
    logContext.logInfo.submissionId = submissionId;
    return this.revisionReviewService.reviseSubmission(logContext);
  }

  @Get()
  @Combined.AlwaysOk({
    description: 'Return all revisions by pagination',
    type: [RevisionResponseDto],
  })
  async getRevisions(
    @Custom.Pagination({
      defaults: {
        page: 1,
        size: 10,
        sort: 'submissionId',
      },
      possibleSorts: ['createdAt', 'submissionId'],
    })
    pagination: Pagination,
  ) {
    return this.revisionQueryService.getRevisions(pagination);
  }

  @Get(':revisionId')
  @Combined.AlwaysOk({
    description: 'Return a revision by id',
    type: RevisionResponseDto,
  })
  async getRevision(@Param('revisionId', ParseUUIDPipe) revisionId: string) {
    return this.revisionQueryService.getRevision(revisionId);
  }
}
