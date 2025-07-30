import { trace } from '@opentelemetry/api';

export const traced = <T>(
  tracerName: string,
  spanName: string,
  fn: () => Promise<T>,
) => {
  const tracer = trace.getTracer(tracerName);
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      return await fn();
    } finally {
      span.end();
    }
  });
};
