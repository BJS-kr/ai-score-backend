import * as process from 'node:process';
import { ILogger } from 'src/common/logger/logger.interface';

export function setupGlobalGuardrail(logger: ILogger): void {
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      logger.error(`Unhandled Rejection at Promise reason: ${reason}`);
    } else if (
      typeof reason === 'string' ||
      typeof reason === 'number' ||
      typeof reason === 'boolean'
    ) {
      logger.error(`Unhandled Rejection at Promise reason: ${reason}`);
    } else if (!reason) {
      logger.error(`Unhandled Rejection at Promise`);
    } else {
      logger.error(`Unhandled Rejection at Promise with unknown reason`);
    }
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });
}
