import process from 'node:process';
import { ILogger } from 'src/common/logger/logger.interface';

export function setupGlobalGuardrail(logger: ILogger): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at Promise ${promise} reason: ${reason}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });
}
