import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Request } from 'express';
import { ReviewLogInfo } from './log.variants';

export type LogContext<T extends ReviewLogInfo = ReviewLogInfo> = {
  traceId: string;
  requestUri: string;
  startTime: number;
  logInfo: T;
};

export const LogContext = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
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
