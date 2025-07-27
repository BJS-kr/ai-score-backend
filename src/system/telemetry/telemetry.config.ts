import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { trace } from '@opentelemetry/api';

const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'ai-score-backend',
  }),
  instrumentations: [new NestInstrumentation(), new HttpInstrumentation()],
  spanProcessors: [new SimpleSpanProcessor(traceExporter)],
});

sdk.start();

/**
 * trace가 제대로 추적이 되지 않아서 임시조치 했습니다.
 * 아래와 같이 무의미해 보이는 코드를 작성하면 traceId가 정상적으로 작동합니다.
 */
trace.getTracer('ai-score-backend').startActiveSpan('app.startup', (span) => {
  span.end();
});
