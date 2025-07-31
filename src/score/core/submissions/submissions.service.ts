import { Injectable } from '@nestjs/common';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import { SubmissionRepository } from '../../IO/respositories/submission.respository';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionResult } from './interfaces/submission.result';
import { LoggerService } from 'src/common/logger/logger.service';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log-context/log.context';
import { Processor } from 'src/score/helper/processor/processor';
import { Transactional } from '@nestjs-cls/transactional';
import { ReviewService } from '../reviews/review.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly mediaService: MediaService,
    private readonly submissionRepository: SubmissionRepository,

    private readonly logger: LoggerService,
    private readonly processor: Processor,
  ) {}

  @Transactional()
  async newSubmission(
    video: Express.Multer.File,
    dto: SubmissionRequestDto,
    logContext: LogContext<NewSubmissionLogInfo>,
  ): Promise<StrictReturn<SubmissionResult>> {
    /**
     * check existing submission
     */
    const alreadySubmittedResult = await this.checkAlreadySubmitted(
      dto.studentId,
      dto.componentType,
    );

    if (!isSuccess(alreadySubmittedResult)) {
      return alreadySubmittedResult;
    }

    /**
     * create a submission record
     */
    const submissionId = await this.submissionRepository.createSubmission(
      dto,
      logContext,
    );

    this.processor.accumulateContextInfo(logContext, {
      submissionId,
    });

    /**
     * Process start
     *
     * 1. Process video
     * 2. Upload video to blob storage
     * 3. Upload audio to blob storage
     * 4. Get review prompt
     * 5. Get review response
     * 6. Parse review response
     * 7. Highlight text
     */

    /**
     * process media because it is a new submission
     */
    const mediaResult = await this.mediaService.processMedia(
      video.path,
      logContext,
    );

    if (!isSuccess(mediaResult)) {
      return mediaResult;
    }

    return this.reviewService.review(
      dto.submitText,
      dto.studentId,
      dto.studentName,
      mediaResult.data.videoSasUrl,
      mediaResult.data.audioSasUrl,
      logContext,
    );
  }

  private async checkAlreadySubmitted(
    studentId: string,
    componentType: string,
  ): Promise<StrictReturn<boolean>> {
    const alreadySubmittedRecord =
      await this.submissionRepository.checkAlreadySubmitted(
        studentId,
        componentType,
      );

    if (alreadySubmittedRecord) {
      this.logger.warn(
        `Student ${studentId} already submitted for ${componentType}`,
      );

      return {
        success: false,
        error: 'Already submitted',
      };
    }

    return {
      success: true,
      data: true,
    };
  }
}
