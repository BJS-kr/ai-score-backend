import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggerService } from '../../logger/logger.service';
import { Request } from 'express';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.originalUrl;

    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.info(
          `${method} ${url} completed in ${Date.now() - start}ms`,
        );
      }),
    );
  }
}
