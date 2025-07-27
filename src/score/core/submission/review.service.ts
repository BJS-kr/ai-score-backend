import { Injectable } from '@nestjs/common';
import { SubmissionRequestDto } from '../../router/dto/request/submission.request.dto';
import {
  EssayEvaluation,
  ScoreRepository,
} from '../../IO/respositories/score.respository';
import { AzureBlobStorageIntegration } from '../../IO/integrations/azure-blob-storage.integration';
import { AzureOpenAIIntegration } from '../../IO/integrations/azure-openai.integration';
import { VideoService } from '../../IO/video/video.service';
import { StrictReturn } from 'src/score/helper/processor/strict.return';
import { SubmissionResult } from './interfaces/submission.result';
import { LoggerService } from 'src/common/logger/logger.service';
import { MediaType } from '@prisma/client';
import { LogContext } from 'src/common/decorators/param/log.context';
import { Processor } from 'src/score/helper/processor/processor';
import { REVIEW_PROMPT } from './resources/review.prompt';

export type SubmissionLogInfo = {
  localVideoPath?: string;
  localAudioPath?: string;
  videoFileUrl?: string;
  videoSasUrl?: string;
  audioFileUrl?: string;
  audioSasUrl?: string;
  reviewPrompt?: string;
  reviewResponse?: string;
  score?: number;
  feedback?: string;
  highlights?: string[];
  highlightedText?: string;
};

@Injectable()
export class ScoreService {
  constructor(
    private readonly scoreRepository: ScoreRepository,
    private readonly azureBlobStorageIntegration: AzureBlobStorageIntegration,
    private readonly azureOpenAIIntegration: AzureOpenAIIntegration,
    private readonly videoService: VideoService,
    private readonly logger: LoggerService,
    private readonly processor: Processor,
  ) {}

  async submitForReview(
    video: Express.Multer.File,
    dto: SubmissionRequestDto,
    logContext: LogContext<SubmissionLogInfo>,
  ): Promise<StrictReturn<SubmissionResult | null>> {
    /**
     * check existing submission
     */
    const alreadySubmittedResult = await this.checkAlreadySubmitted(
      dto.studentId,
      dto.componentType,
    );

    if (this.processor.isFail(alreadySubmittedResult)) {
      return alreadySubmittedResult;
    }

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

    const submissionId = await this.scoreRepository.createSubmission(
      dto,
      logContext,
    );

    /**
     * process video using ffmpeg
     */
    const processedVideoResult = await this.processVideo(
      video.path,
      submissionId,
      logContext,
    );

    if (this.processor.isFail(processedVideoResult)) {
      return processedVideoResult;
    }

    /**
     * Upload video to blob storage
     */
    const videoUploadResult = await this.uploadVideo(
      submissionId,
      processedVideoResult.data!.localVideoPath,
      logContext,
    );

    if (this.processor.isFail(videoUploadResult)) {
      return videoUploadResult;
    }

    /**
     * Upload audio to blob storage
     */
    const audioUploadResult = await this.uploadAudio(
      submissionId,
      processedVideoResult.data!.localAudioPath,
      logContext,
    );

    if (this.processor.isFail(audioUploadResult)) {
      return audioUploadResult;
    }

    /**
     * Get review prompt
     */
    const rawReviewResult = await this.getRawReviewResponse(
      submissionId,
      dto.submitText,
      logContext,
    );

    if (this.processor.isFail(rawReviewResult)) {
      return rawReviewResult;
    }

    /**
     * Parse review response
     */
    const parsedReviewResult = await this.parseReviewResponse(
      submissionId,
      logContext,
      rawReviewResult.data!.reviewResponse,
    );

    if (this.processor.isFail(parsedReviewResult)) {
      return parsedReviewResult;
    }

    /**
     * Highlight text
     */
    const highlightedText = this.highlightText(
      dto.submitText,
      parsedReviewResult.data!.highlights,
    );

    this.processor.accumulateContextInfo(logContext, {
      highlightedText,
    });

    /**
     * Complete submission
     */
    await this.completeSubmission(
      submissionId,
      parsedReviewResult.data!,
      logContext,
    );

    return {
      success: true,
      message: 'Submission completed',
      data: {
        message: 'Submission completed',
        videoUrl: videoUploadResult.data!.videoSasUrl!,
        audioUrl: audioUploadResult.data!.audioSasUrl!,
        score: parsedReviewResult.data!.score,
        feedback: parsedReviewResult.data!.feedback,
        highlights: parsedReviewResult.data!.highlights,
        highlightedText,
      },
    };
  }

  private async checkAlreadySubmitted(
    studentId: string,
    componentType: string,
  ) {
    const alreadySubmittedRecord =
      await this.scoreRepository.checkAlreadySubmitted(
        studentId,
        componentType,
      );

    if (alreadySubmittedRecord) {
      this.logger.warn(
        `Student ${studentId} already submitted for ${componentType}`,
      );

      return {
        success: false,
        message: 'Already submitted',
        data: null,
      };
    }
    return {
      success: true,
      data: true,
    };
  }

  private async processVideo(
    videoPath: string,
    submissionId: string,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    return this.processor.process(
      await this.videoService.processVideo({
        inputFilePath: videoPath,
        submissionId,
      }),
      submissionId,
      logContext,
      ['localVideoPath', 'localAudioPath'],
      'video processing',
    );
  }

  private async uploadVideo(
    submissionId: string,
    localVideoPath: string,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    return this.processor.process(
      await this.azureBlobStorageIntegration.uploadFile(
        submissionId,
        localVideoPath,
        MediaType.VIDEO,
      ),
      submissionId,
      logContext,
      ['videoFileUrl', 'videoSasUrl'],
      'video upload',
    );
  }

  private async uploadAudio(
    submissionId: string,
    localAudioPath: string,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    return this.processor.process(
      await this.azureBlobStorageIntegration.uploadFile(
        submissionId,
        localAudioPath,
        MediaType.AUDIO,
      ),
      submissionId,
      logContext,
      ['audioFileUrl', 'audioSasUrl'],
      'audio upload',
    );
  }

  private async getRawReviewResponse(
    submissionId: string,
    submitText: string,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    return this.processor.process(
      await this.azureOpenAIIntegration.getRawReviewResponse(
        this.buildEvaluationPrompt(submitText),
      ),
      submissionId,
      logContext,
      ['reviewPrompt', 'reviewResponse'],
      'review prompt',
    );
  }

  private async parseReviewResponse(
    submissionId: string,
    logContext: LogContext<SubmissionLogInfo>,
    rawReviewResponse: string,
  ) {
    return this.processor.process(
      this.azureOpenAIIntegration.parseAndValidateResponse(rawReviewResponse),
      submissionId,
      logContext,
      ['score', 'feedback', 'highlights'],
      'review response',
    );
  }

  private async completeSubmission(
    submissionId: string,
    evaluation: EssayEvaluation,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    await this.scoreRepository.completeSubmission(
      submissionId,
      evaluation.score,
      evaluation.feedback,
      evaluation.highlights,
      logContext,
    );

    this.logger.info(
      `Submission ${submissionId} completed\n
       videoUrl: ${logContext.logInfo.videoFileUrl}\n
       audioUrl: ${logContext.logInfo.audioFileUrl}\n
       videoSasUrl: ${logContext.logInfo.videoSasUrl}\n
       audioSasUrl: ${logContext.logInfo.audioSasUrl}\n
       score: ${logContext.logInfo.score}\n
       feedback: ${logContext.logInfo.feedback}\n
       highlights: ${logContext.logInfo.highlights || []}\n
       highlightedText: ${logContext.logInfo.highlightedText}\n
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
