import { Injectable } from '@nestjs/common';
import {
  LogContext,
  ReviewLogInfo,
} from 'src/common/decorators/param/log-context/log.context';
import { Processor } from 'src/score/helper/processor/processor';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionResult } from '../submissions/interfaces/submission.result';
import { ReviewParser } from './review.parser';
import { AzureOpenAIIntegration } from 'src/score/IO/integrations/azure-openai.integration';
import { EssayEvaluation } from '../submissions/interfaces/essay.evaluation';
import { REVIEW_PROMPT } from '../submissions/resources/review.prompt';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly processor: Processor,
    private readonly reviewParser: ReviewParser,
    private readonly azureOpenAIIntegration: AzureOpenAIIntegration,
    private readonly submissionRepository: SubmissionRepository,
    private readonly logger: LoggerService,
  ) {}

  async review(
    submitText: string,
    studentId: string,
    studentName: string,
    videoSasUrl: string,
    audioSasUrl: string,
    logContext: LogContext<ReviewLogInfo>,
  ): Promise<StrictReturn<SubmissionResult>> {
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
    // TODO: open ai integartion does not handle error. fix it to return StrictReturn
    // TODO: ai reponse + parsing logic shoudld be retried 3 times

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

  private highlightText(submitText: string, highlights: string[]): string {
    const escapedHighlights = highlights
      .map((highlight) => highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const regex = new RegExp(`(${escapedHighlights})`, 'gi');

    return submitText.replace(regex, '<b>$1</b>');
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

  private buildEvaluationPrompt(submitText: string): string {
    return REVIEW_PROMPT.replace('$ESSAY_TEXT$', submitText);
  }
}
