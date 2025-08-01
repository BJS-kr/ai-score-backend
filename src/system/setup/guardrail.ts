import * as process from 'node:process';
import { ExceptionAlert } from 'src/system/alert/exception.alert';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class GlobalGuardrail implements OnModuleInit {
  constructor(
    private readonly exceptionAlert: ExceptionAlert,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    process.on('unhandledRejection', (reason) => {
      if (reason instanceof Error) {
        this.logger.error(`Unhandled Rejection at Promise reason: ${reason}`);
        this.exceptionAlert.alert(reason);
      } else if (
        typeof reason === 'string' ||
        typeof reason === 'number' ||
        typeof reason === 'boolean' ||
        typeof reason === 'object'
      ) {
        const stringifiedReason = JSON.stringify(reason);
        this.logger.error(
          `Unhandled Rejection at Promise reason: ${stringifiedReason}`,
        );
        this.exceptionAlert.alert(new Error(stringifiedReason));
      } else if (!reason) {
        this.logger.error(`Unhandled Rejection at Promise`);
      } else {
        this.logger.error(`Unhandled Rejection at Promise with unknown reason`);
      }
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      this.exceptionAlert.alert(error);
    });
  }
}
