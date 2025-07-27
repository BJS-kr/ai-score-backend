import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { ILogger } from './logger.interface';

@Injectable()
export class LoggerService implements ILogger {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
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
  ): any {
    const traceId = this.getTraceId();
    const logData: any = {
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
    const logData = this.formatMessage('error', message, context, meta);
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
