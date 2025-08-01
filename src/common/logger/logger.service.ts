import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';
import pino from 'pino';

type LogData = {
  level: string;
  message: string;
  traceId: string;
  timestamp: string;
  context?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

@Injectable()
export class LoggerService {
  private readonly logger: pino.Logger;

  constructor(private readonly configService: ConfigService) {
    this.logger = pino({
      level: this.configService.get('LOG_LEVEL') || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    });
  }

  private getTraceId(): string {
    const currentSpan = trace.getActiveSpan();
    return currentSpan?.spanContext().traceId || 'no-trace-id';
  }

  private formatMessage(
    level: string,
    message: string,
    context?: string,
    meta?: Record<string, any>,
  ) {
    const traceId = this.getTraceId();
    const logData: LogData = {
      level,
      message,
      traceId,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      logData.context = context;
    }

    if (meta) {
      Object.assign(logData, meta);
    }

    return logData;
  }

  info(message: string, context?: string, meta?: Record<string, any>): void {
    const logData = this.formatMessage('info', message, context, meta);
    this.logger.info(logData);
  }

  error(
    message: string,
    error?: Error,
    context?: string,
    meta?: Record<string, any>,
  ): void {
    const logData: LogData = this.formatMessage(
      'error',
      message,
      context,
      meta,
    );
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.logger.error(logData);
  }

  warn(message: string, context?: string, meta?: Record<string, any>): void {
    const logData = this.formatMessage('warn', message, context, meta);
    this.logger.warn(logData);
  }

  debug(message: string, context?: string, meta?: Record<string, any>): void {
    const logData = this.formatMessage('debug', message, context, meta);
    this.logger.debug(logData);
  }

  trace(message: string, context?: string, meta?: Record<string, any>): void {
    const logData = this.formatMessage('trace', message, context, meta);
    this.logger.trace(logData);
  }
}
