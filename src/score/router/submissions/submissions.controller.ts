import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import {
  SubmissionRequestDto,
  SubmissionRequestSchema,
} from './dto/request/submission.request.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileSizeValidationPipe } from 'src/common/validators/fileSize.validator';
import { ReviewResponseDto } from '../common/dto/response/review.response.dto';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log-context/log.context';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { SubmissionsQueryService } from '../../core/submissions/submissions.query.service';
import { SubmissionQueryResponseDto } from './dto/response/submission.query.response.dto';
import { SubmissionsQueryRequestDto } from './dto/request/submissions.query.request.dto';
import Combined from 'src/common/decorators/api';
import Custom from 'src/common/decorators/param';
import { SubmissionsQueryResponseDto } from './dto/response/submissions.query.response.dto';
import { SubmissionsService } from 'src/score/core/submissions/submissions.service';

@Controller('submissions')
@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class SubmissionController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly queryService: SubmissionsQueryService,
  ) {}

  @Post()
  @Combined.FileUpload({
    additionalType: SubmissionRequestSchema,
  })
  @Combined.AlwaysOk({
    description: 'Submission result',
    type: ReviewResponseDto,
  })
  async submitForReview(
    @UploadedFile(FileSizeValidationPipe) file: Express.Multer.File,
    @Body() dto: SubmissionRequestDto,
    @Custom.LogContext() logContext: LogContext<NewSubmissionLogInfo>,
  ): Promise<ReviewResponseDto> {
    if (!file) {
      return ReviewResponseDto.build(
        {
          success: false,
          error: 'File is required',
        },
        Date.now() - logContext.startTime,
      );
    }

    const submissionResult = await this.submissionsService.newSubmission(
      file,
      dto,
      logContext,
    );
    const apiLatency = Date.now() - logContext.startTime;

    return ReviewResponseDto.build(submissionResult, apiLatency);
  }

  @Get()
  @Combined.AlwaysOk({
    description: 'return all submissions by pagination',
    type: SubmissionsQueryResponseDto,
  })
  async getSubmissions(
    @Custom.Pagination({
      defaults: {
        page: 1,
        size: 10,
        sort: 'studentId',
      },
      possibleSorts: ['studentId', 'studentName', 'createdAt'],
    })
    pagination: Pagination,
    @Query() { status }: SubmissionsQueryRequestDto,
  ) {
    return this.queryService.getSubmissions(pagination, status);
  }

  @Get(':submissionId')
  @Combined.AlwaysOk({
    description: 'return submission by submissionId',
    type: SubmissionQueryResponseDto,
  })
  async getSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.queryService.getSubmission(submissionId);
  }
}
