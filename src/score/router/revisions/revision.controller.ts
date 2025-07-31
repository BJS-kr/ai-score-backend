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
import { ReviewResponseDto } from '../common/dto/response/review.response.dto';
import { RevisionRequestDto } from './dto/request/revision.request.dto';
import Combined from 'src/common/decorators/api';
import Custom from 'src/common/decorators/param';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { RevisionQueryService } from 'src/score/core/revisions/revision.query.service';
import { RevisionResponseDto } from './dto/response/revision.response.dto';
import { RevisionsResponseDto } from './dto/response/revisions.response.dto';
import { RevisionService } from 'src/score/core/revisions/revision.service';

@Controller('revision')
@ApiTags('Revision')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class RevisionController {
  constructor(
    private readonly revisionService: RevisionService,
    private readonly revisionQueryService: RevisionQueryService,
  ) {}

  @Post()
  @Combined.AlwaysOk({
    description: 'Revision result',
    type: ReviewResponseDto,
  })
  async createRevision(
    @Body() { submissionId }: RevisionRequestDto,
    @Custom.LogContext() logContext: LogContext,
  ) {
    logContext.logInfo.submissionId = submissionId;
    const result = await this.revisionService.reviseSubmission(logContext);
    const apiLatency = Date.now() - logContext.startTime;
    return ReviewResponseDto.build(result, apiLatency);
  }

  @Get()
  @Combined.AlwaysOk({
    description: 'Return all revisions by pagination',
    type: RevisionsResponseDto,
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
