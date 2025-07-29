import { Injectable } from '@nestjs/common';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import {
  EssayEvaluation,
  SubmissionRepository,
} from '../../IO/respositories/submission.respository';
import { AzureBlobStorageIntegration } from '../../IO/integrations/azure-blob-storage.integration';
import { AzureOpenAIIntegration } from '../../IO/integrations/azure-openai.integration';
import { VideoService } from '../../IO/video/video.service';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionResult } from './interfaces/submission.result';
import { LoggerService } from 'src/common/logger/logger.service';
import { MediaType } from '@prisma/client';
import {
  LogContext,
  NewSubmissionLogInfo,
  ReviewLogInfo,
} from 'src/common/decorators/param/log.context';
import { Processor } from 'src/score/helper/processor/processor';
import { REVIEW_PROMPT } from './resources/review.prompt';
import { ReviewParser } from './submissions.review.parser';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class SubmissionsReviewService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly azureBlobStorageIntegration: AzureBlobStorageIntegration,
    private readonly azureOpenAIIntegration: AzureOpenAIIntegration,
    private readonly videoService: VideoService,
    private readonly logger: LoggerService,
    private readonly reviewParser: ReviewParser,
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

    const submissionId = await this.submissionRepository.createSubmission(
      dto,
      logContext,
    );

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

    this.processor.accumulateContextInfo(logContext, {
      submissionId,
    });

    /**
     * process video using ffmpeg
     */
    const processedVideoResult = await this.processVideo(
      video.path,
      logContext,
    );

    if (!isSuccess(processedVideoResult)) {
      return processedVideoResult;
    }

    /**
     * Upload video to blob storage
     */
    const videoUploadResult = await this.uploadVideo(
      processedVideoResult.data.localVideoPath,
      logContext,
    );

    if (!isSuccess(videoUploadResult)) {
      return videoUploadResult;
    }

    /**
     * Upload audio to blob storage
     */
    const audioUploadResult = await this.uploadAudio(
      processedVideoResult.data.localAudioPath,
      logContext,
    );

    if (!isSuccess(audioUploadResult)) {
      return audioUploadResult;
    }

    return this.submitForReview(
      dto.submitText,
      logContext,
      videoUploadResult.data.videoSasUrl!,
      audioUploadResult.data.audioSasUrl!,
      dto.studentId,
      dto.studentName,
    );
  }

  async submitForReview(
    submitText: string,
    logContext: LogContext<ReviewLogInfo>,
    videoSasUrl: string,
    audioSasUrl: string,
    studentId: string,
    studentName: string,
  ): Promise<StrictReturn<SubmissionResult>> {
    /**
     * Get review prompt
     */
    const rawReviewResult = await this.getRawReviewResponse(
      submitText,
      logContext,
    );

    if (!isSuccess(rawReviewResult)) {
      return rawReviewResult;
    }

    /**
     * Parse review response
     */
    const parsedReviewResult = await this.parseReviewResponse(
      rawReviewResult.data.reviewResponse,
      logContext,
    );

    if (!isSuccess(parsedReviewResult)) {
      return parsedReviewResult;
    }

    /**
     * Highlight text
     */
    const highlightedText = this.highlightText(
      submitText,
      parsedReviewResult.data.highlights,
    );

    this.processor.accumulateContextInfo(logContext, {
      highlightedText,
    });

    /**
     * Complete submission
     */
    await this.completeSubmission(parsedReviewResult.data, logContext);

    return {
      success: true,
      message: 'Review completed',
      data: {
        message: 'Review completed',
        videoUrl: videoSasUrl,
        audioUrl: audioSasUrl,
        score: parsedReviewResult.data.score,
        feedback: parsedReviewResult.data.feedback,
        highlights: parsedReviewResult.data.highlights,
        highlightedText,
        studentId,
        studentName,
        submitText,
      },
    };
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

  private async processVideo(
    videoPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    return this.processor.process(
      await this.videoService.processVideo({
        inputFilePath: videoPath,
        submissionId: logContext.logInfo.submissionId,
      }),
      logContext,
      ['localVideoPath', 'localAudioPath'],
      'video processing',
    );
  }

  private async uploadVideo(
    localVideoPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    const result = await this.processor.process(
      await this.azureBlobStorageIntegration.uploadFile(
        localVideoPath,
        MediaType.VIDEO,
        logContext,
      ),
      logContext,
      ['videoFileUrl', 'videoSasUrl'],
      'video upload',
    );

    if (!isSuccess(result)) {
      return result;
    }

    await this.submissionRepository.createSubmissionMedia(
      logContext.logInfo.submissionId,
      MediaType.VIDEO,
      result.data.videoFileUrl!,
      result.data.videoSasUrl!,
      result.data.videoFileSize!,
    );

    return result;
  }

  private async uploadAudio(
    localAudioPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    const result = await this.processor.process(
      await this.azureBlobStorageIntegration.uploadFile(
        localAudioPath,
        MediaType.AUDIO,
        logContext,
      ),
      logContext,
      ['audioFileUrl', 'audioSasUrl'],
      'audio upload',
    );

    if (!isSuccess(result)) {
      return result;
    }

    await this.submissionRepository.createSubmissionMedia(
      logContext.logInfo.submissionId,
      MediaType.AUDIO,
      result.data.audioFileUrl!,
      result.data.audioSasUrl!,
      result.data.audioFileSize!,
    );

    return result;
  }

  private async getRawReviewResponse(
    submitText: string,
    logContext: LogContext,
  ) {
    return this.processor.process(
      await this.azureOpenAIIntegration.getRawReviewResponse(
        this.buildEvaluationPrompt(submitText),
        logContext,
      ),
      logContext,
      ['reviewPrompt', 'reviewResponse'],
      'review prompt',
    );
  }

  private async parseReviewResponse(
    rawReviewResponse: string,
    logContext: LogContext,
  ) {
    return this.processor.process(
      this.reviewParser.parseAndValidateReview(rawReviewResponse),
      logContext,
      ['score', 'feedback', 'highlights'],
      'review response',
    );
  }

  private async completeSubmission(
    evaluation: EssayEvaluation,
    logContext: LogContext,
  ) {
    await this.submissionRepository.completeSubmission(
      logContext.logInfo.submissionId,
      evaluation.score,
      evaluation.feedback,
      evaluation.highlights,
      logContext,
    );

    this.logger.info(
      `
      Submission Completed\n
      ${JSON.stringify(logContext)}
      `,
    );
  }

  private highlightText(submitText: string, highlights: string[]): string {
    const escapedHighlights = highlights
      .map((highlight) => highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const regex = new RegExp(`(${escapedHighlights})`, 'gi');

    return submitText.replace(regex, '<b>$1</b>');
  }

  private buildEvaluationPrompt(submitText: string): string {
    return REVIEW_PROMPT.replace('$ESSAY_TEXT$', submitText);
  }
}
