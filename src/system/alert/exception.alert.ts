/**
 * 사내에 전파되는 알람
 * 실제 메신저가 없기 때문에 콘솔에 출력
 */

import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class ExceptionAlert {
  constructor(private readonly logger: LoggerService) {}

  alert(exception: Error) {
    const traceId =
      trace.getActiveSpan()?.spanContext().traceId || 'no-trace-id';
    const now = new Date().toISOString();

    this.logger.error(
      `🚨 Unhandled exception occurred (${traceId}) at ${now} 🚨: ${exception.message} ${exception.stack}`,
    );
  }
}
