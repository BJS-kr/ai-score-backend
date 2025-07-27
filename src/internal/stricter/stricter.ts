import { Injectable } from '@nestjs/common';
import { LogContext } from 'src/common/decorators/param/log.context';
import { LoggerService } from 'src/common/logger/logger.service';
import { StrictReturn } from 'src/internal/stricter/strict.return';
import { SubmissionLogInfo } from 'src/score/core/review.service';
import { ScoreRepository } from 'src/score/IO/respositories/score.respository';

@Injectable()
export class StricterHelper {
  constructor(
    private readonly logger: LoggerService,
    private readonly scoreRepository: ScoreRepository,
  ) {}

  accumulateContextInfo<T extends Record<string, unknown>>(
    logContext: LogContext<T>,
    newInfo: Partial<T>,
  ) {
    logContext.logInfo = { ...logContext.logInfo, ...newInfo };
  }

  async handleFail<T extends Record<string, unknown>>({
    internalError,
    externalError,
    submissionId,
    logContext,
  }: {
    internalError: string;
    externalError: string;
    submissionId: string;
    logContext: LogContext<T>;
  }) {
    this.logger.trace(internalError);

    await this.scoreRepository.failSubmission(
      submissionId,
      logContext,
      externalError,
    );

    return {
      success: false,
      message: externalError,
      data: null,
    };
  }

  async process<T>(
    source: StrictReturn<T>,
    submissionId: string,
    logContext: LogContext<SubmissionLogInfo>,
    keys: (keyof NonNullable<T>)[],
    step: string,
  ): Promise<StrictReturn<T | null>> {
    if (!source.success || !source.data) {
      return this.handleFail({
        internalError: `${step} failed for submission ${submissionId}
         error: ${source.error}
        `,
        externalError: `${step} failed`,
        submissionId,
        logContext,
      });
    }

    keys.forEach((key) => {
      this.accumulateContextInfo(logContext, {
        [key]: source.data![key],
      });
    });

    return source;
  }

  isFail<T>(result: StrictReturn<T | null>): result is StrictReturn<null> {
    return !result.success || !result.data;
  }
}
