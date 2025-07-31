import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Request } from 'express';

export type LogContext<T extends ReviewLogInfo = ReviewLogInfo> = {
  traceId: string;
  requestUri: string;
  startTime: number;
  logInfo: T;
};

export type ReviewLogInfo = {
  submissionId: string;
  videoSasUrl?: string;
  audioSasUrl?: string;
  reviewPrompt?: string;
  reviewResponse?: string;
  score?: number;
  feedback?: string;
  highlights?: string[];
  highlightedText?: string;
};

export type NewSubmissionLogInfo = ReviewLogInfo & {
  localVideoPath?: string;
  localAudioPath?: string;
  videoFileUrl?: string;
  audioFileUrl?: string;
};

export const LogContext = createParamDecorator(
  (data: any, ctx: ExecutionContext) => {
    const traceId =
      trace.getActiveSpan()?.spanContext().traceId || 'no-trace-id';

    return {
      traceId,
      requestUri: ctx.switchToHttp().getRequest<Request>().originalUrl,
      startTime: Date.now(),
      logInfo: {},
    };
  },
);
