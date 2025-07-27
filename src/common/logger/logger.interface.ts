export interface ILogger {
  info(message: string, context?: string, meta?: Record<string, any>): void;
  error(
    message: string,
    error?: Error,
    context?: string,
    meta?: Record<string, any>,
  ): void;
  warn(message: string, context?: string, meta?: Record<string, any>): void;
  debug(message: string, context?: string, meta?: Record<string, any>): void;
  trace(message: string, context?: string, meta?: Record<string, any>): void;
}
