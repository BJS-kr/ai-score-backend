import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RequestLoggingInterceptor } from './interceptors/request.logging.intercpetor';
import { HttpExceptionFilter } from '../filters/http.exception.filter';

export const APP_PROVIDERS = [
  {
    provide: APP_INTERCEPTOR,
    useClass: RequestLoggingInterceptor,
  },
  {
    provide: APP_FILTER,
    useClass: HttpExceptionFilter,
  },
];
