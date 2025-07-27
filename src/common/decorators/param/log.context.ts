import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Request } from 'express';

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

export type LogContext<T extends Record<string, unknown>> = {
  traceId: string;
  requestUri: string;
  startTime: number;
  logInfo: T;
};
