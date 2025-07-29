import { trace } from '@opentelemetry/api';

export const traced = (
  tracerName: string,
  spanName: string,
  fn: () => Promise<void>,
) => {
  const tracer = trace.getTracer(tracerName);
  return tracer.startActiveSpan(spanName, async (span) => {
    await fn();
    span.end();
  });
};
