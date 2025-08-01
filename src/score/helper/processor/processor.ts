import { Injectable } from '@nestjs/common';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { LoggerService } from 'src/common/logger/logger.service';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { caught } from './caught';
import { ReviewLogInfo } from 'src/common/decorators/param/log-context/log.variants';

@Injectable()
export class Processor {
  constructor(
    private readonly logger: LoggerService,
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  async process<T>(
    source: Promise<StrictReturn<T>>,
    logContext: LogContext,
    keys: (keyof NonNullable<T>)[],
    step: string,
  ): Promise<StrictReturn<T>> {
    const result = await caught(source);

    if (!isSuccess(result)) {
      return this.handleFail<T>({
        internalError: `${step} failed for submission ${logContext.logInfo.submissionId}
         error: ${result.error}
        `,
        externalError: `${step} failed`,
        logContext,
      });
    }

    keys.forEach((key) => {
      this.accumulateContextInfo(logContext, {
        [key]: (result.data as NonNullable<T>)[key],
      });
    });

    return source;
  }

  async handleFail<T>({
    internalError,
    externalError,
    logContext,
  }: {
    internalError: string;
    externalError: string;
    logContext: LogContext;
  }): Promise<StrictReturn<T>> {
    this.logger.trace(internalError);

    await this.submissionRepository.failSubmission(
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

  accumulateContextInfo<T extends ReviewLogInfo>(
    logContext: LogContext<T>,
    newInfo: Partial<T>,
  ) {
    logContext.logInfo = { ...logContext.logInfo, ...newInfo };
  }
}
