import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { LoggerService } from 'src/common/logger/logger.service';

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
