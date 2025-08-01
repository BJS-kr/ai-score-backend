import { Injectable, OnModuleInit } from '@nestjs/common';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { Processor } from 'src/score/helper/processor/processor';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { ReviewParserService } from './review.parser.service';
import { AzureOpenAIService } from 'src/score/IO/integrations/azure-openai/azure-openai.service';
import { REVIEW_PROMPT } from '../submissions/resources/review.prompt';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { LoggerService } from 'src/common/logger/logger.service';
import { ReviewLogInfo } from 'src/common/decorators/param/log-context/log.variants';
import { ConfigService } from '@nestjs/config';

export interface EssayEvaluation {
  score: number;
  feedback: string;
  highlights: string[];
}

export interface ReviewResult {
  message: string;
  videoUrl: string;
  audioUrl: string;
  score: number;
  feedback: string;
  highlights: string[];
  highlightedText: string;
  studentId: string;
  studentName: string;
  submitText: string;
}

@Injectable()
export class ReviewService implements OnModuleInit {
  private EVALUATION_MAX_RETRY_COUNT: number;

  constructor(
    private readonly processor: Processor,
    private readonly reviewParserService: ReviewParserService,
    private readonly azureOpenAIService: AzureOpenAIService,
    private readonly submissionRepository: SubmissionRepository,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.EVALUATION_MAX_RETRY_COUNT = parseInt(
      this.configService.get<string>('EVALUATION_MAX_RETRY_COUNT') || '3',
    );
  }

  async review(
    submitText: string,
    studentId: string,
    studentName: string,
    videoSasUrl: string,
    audioSasUrl: string,
    logContext: LogContext<ReviewLogInfo>,
  ): Promise<StrictReturn<ReviewResult>> {
    /**
     * Get essay evaluation with retry
     */
    const essayEvaluationResult = await this.getEssayEvaluationWithRetry(
      submitText,
      logContext,
      this.EVALUATION_MAX_RETRY_COUNT,
    );

    if (!isSuccess(essayEvaluationResult)) {
      return essayEvaluationResult;
    }

    /**
     * Highlight text
     */
    const highlightedText = this.highlightText(
      submitText,
      essayEvaluationResult.data.highlights,
    );

    this.processor.accumulateContextInfo(logContext, {
      highlightedText,
    });

    /**
     * Complete submission
     */
    await this.completeSubmission(essayEvaluationResult.data, logContext);

    return {
      success: true,
      message: 'Review completed',
      data: {
        message: 'Review completed',
        videoUrl: videoSasUrl,
        audioUrl: audioSasUrl,
        score: essayEvaluationResult.data.score,
        feedback: essayEvaluationResult.data.feedback,
        highlights: essayEvaluationResult.data.highlights,
        highlightedText,
        studentId,
        studentName,
        submitText,
      },
    };
  }

  /**
   * Core
   */
  private async getRawReviewResponse(
    submitText: string,
    logContext: LogContext,
  ) {
    return this.processor.process(
      this.azureOpenAIService.getRawReviewResponse(
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
      Promise.resolve(
        this.reviewParserService.parseAndValidateReview(rawReviewResponse),
      ),
      logContext,
      ['score', 'feedback', 'highlights'],
      'review response',
    );
  }

  /**
   * Retry if review process fails
   */
  private async getEssayEvaluationWithRetry(
    submitText: string,
    logContext: LogContext,
    retryCount: number,
  ): Promise<StrictReturn<EssayEvaluation>> {
    /**
     * 재시도 횟수 만큼 getEssayEvaluation 호출
     */
    for (let retry = 1; retry <= retryCount; retry++) {
      const essayEvaluationResult = await this.getEssayEvaluation(
        submitText,
        logContext,
      );

      if (isSuccess(essayEvaluationResult)) {
        return essayEvaluationResult;
      }

      /**
       * 최대 횟수에 도달한 경우 Failure 반환(에러가 이미 객체에 포함)
       */
      if (retry === retryCount) {
        return essayEvaluationResult;
      }
    }

    return {
      success: false,
      error: 'Failed to get essay evaluation',
    };
  }

  private async getEssayEvaluation(
    submitText: string,
    logContext: LogContext,
  ): Promise<StrictReturn<EssayEvaluation>> {
    /**
     * Get raw review response
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

    return parsedReviewResult;
  }

  private highlightText(submitText: string, highlights: string[]): string {
    const escapedHighlights = highlights
      .map((highlight) => highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const regex = new RegExp(`(${escapedHighlights})`, 'gi');

    return submitText.replace(regex, '<b>$1</b>');
  }

  /**
   * Completion
   */
  private async completeSubmission(
    evaluation: EssayEvaluation,
    logContext: LogContext,
  ) {
    await this.submissionRepository.completeSubmission(
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

  private buildEvaluationPrompt(submitText: string): string {
    return REVIEW_PROMPT.replace('$ESSAY_TEXT$', submitText);
  }
}
