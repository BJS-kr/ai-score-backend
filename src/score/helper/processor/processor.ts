import { Injectable } from '@nestjs/common';
import { LogContext } from 'src/common/decorators/param/log.context';
import { LoggerService } from 'src/common/logger/logger.service';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionLogInfo } from 'src/score/core/submission/review.service';
import { ScoreRepository } from 'src/score/IO/respositories/score.respository';

@Injectable()
export class Processor {
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

  // TODO: handleFail은 오직 submission만 핸들링 할 수 있다. 내부에서 사용하는 메서드가 failSubmission이기 때문
  async handleFail<T>({
    internalError,
    externalError,
    logContext,
  }: {
    internalError: string;
    externalError: string;
    logContext: LogContext<SubmissionLogInfo>;
  }): Promise<StrictReturn<T>> {
    this.logger.trace(internalError);

    await this.scoreRepository.failSubmission(
      logContext.logInfo.submissionId,
      logContext.traceId,
      logContext.startTime,
      externalError,
    );

    return {
      success: false,
      error: externalError,
    };
  }

  async process<T>(
    source: StrictReturn<T>,
    logContext: LogContext<SubmissionLogInfo>,
    keys: (keyof NonNullable<T>)[],
    step: string,
  ): Promise<StrictReturn<T>> {
    if (!isSuccess(source)) {
      return this.handleFail<T>({
        internalError: `${step} failed for submission ${logContext.logInfo.submissionId}
         error: ${source.error}
        `,
        externalError: `${step} failed`,
        logContext,
      });
    }

    keys.forEach((key) => {
      this.accumulateContextInfo(logContext, {
        [key]: (source.data as NonNullable<T>)[key],
      });
    });

    return source;
  }
}
