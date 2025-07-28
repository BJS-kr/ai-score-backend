import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import {
  ScoreService,
  SubmissionLogInfo,
} from '../core/submission/review.service';
import {
  SubmissionRequestDto,
  SubmissionRequestSchema,
} from './dto/request/submission.request.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileSizeValidationPipe } from 'src/common/validators/fileSize.validator';
import { SubmissionResponseDto } from './dto/response/submission.response.dto';
import { Combined } from 'src/common/decorators/api';
import { LogContext } from 'src/common/decorators/param/log.context';
import { Custom } from 'src/common/decorators/param';
import { AuthGuard } from 'src/common/guards/auth.guard';

@Controller()
@ApiTags('Essay Review')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Post('submissions')
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
    @Custom.LogContext() logContext: LogContext<SubmissionLogInfo>,
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

    const submissionResult = await this.scoreService.submitForReview(
      file,
      dto,
      logContext,
    );
    const apiLatency = Date.now() - logContext.startTime;

    return SubmissionResponseDto.build(submissionResult, dto, apiLatency);
  }
}
