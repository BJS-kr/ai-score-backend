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
import { SubmissionsReviewService } from '../../core/submissions/submissions.review.service';
import {
  SubmissionRequestDto,
  SubmissionRequestSchema,
} from './dto/request/submission.request.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileSizeValidationPipe } from 'src/common/validators/fileSize.validator';
import { SubmissionResponseDto } from './dto/response/submission.response.dto';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log.context';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Pagination } from 'src/common/decorators/param/pagination';
import { SubmissionsQueryService } from '../../core/submissions/submissions.query.service';
import { SubmissionsQueryResponseDto } from './dto/response/submissions.query.response.dto';
import { Submission } from '@prisma/client';
import { SubmissionsQueryRequestDto } from './dto/request/submissions.query.request.dto';
import Combined from 'src/common/decorators/api';
import Custom from 'src/common/decorators/param';

@Controller('submissions')
@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class SubmissionController {
  constructor(
    private readonly reviewService: SubmissionsReviewService,
    private readonly queryService: SubmissionsQueryService,
  ) {}

  @Post()
  @Combined.FileUpload({
    additionalType: SubmissionRequestSchema,
  })
  @Combined.AlwaysOk({
    description: 'Submission result',
    type: SubmissionResponseDto,
  })
  async submitForReview(
    @UploadedFile(FileSizeValidationPipe) file: Express.Multer.File,
    @Body() dto: SubmissionRequestDto,
    @Custom.LogContext() logContext: LogContext<NewSubmissionLogInfo>,
  ): Promise<SubmissionResponseDto> {
    if (!file) {
      return SubmissionResponseDto.build(
        {
          success: false,
          error: 'File is required',
        },
        dto,
        Date.now() - logContext.startTime,
      );
    }

    const submissionResult = await this.reviewService.newSubmission(
      file,
      dto,
      logContext,
    );
    const apiLatency = Date.now() - logContext.startTime;

    return SubmissionResponseDto.build(submissionResult, dto, apiLatency);
  }

  @Get()
  @Combined.AlwaysOk({
    description: 'return all submissions by pagination',
    type: [SubmissionsQueryResponseDto],
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
  ): Promise<Submission[]> {
    return this.queryService.getSubmissions(pagination, status);
  }

  @Get(':submissionId')
  @Combined.AlwaysOk({
    description: 'return submission by submissionId',
    type: SubmissionResponseDto,
  })
  async getSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.queryService.getSubmission(submissionId);
  }
}
