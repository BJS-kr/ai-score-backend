import { Injectable } from '@nestjs/common';
import { LogContext } from 'src/common/decorators/param/log.context';
import { LoggerService } from 'src/common/logger/logger.service';
import { ExternalCallLogRepository } from 'src/score/IO/respositories/external.call.log.repository';

@Injectable()
export class ExternalLogger {
  constructor(
    private readonly logger: LoggerService,
    private readonly externalCallLogRepository: ExternalCallLogRepository,
  ) {}

  logExternalCall(
    logContext: LogContext,
    latency: number,
    success: boolean,
    context: string,
    taskName: string,
    description: string,
  ) {
    this.logger.trace(description, context);
    return this.externalCallLogRepository.createLog({
      traceId: logContext.traceId,
      submissionId: logContext.logInfo.submissionId,
      context,
      success,
      latency,
      taskName,
      description,
    });
  }
}
