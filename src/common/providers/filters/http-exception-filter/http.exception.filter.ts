import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ExceptionAlert } from '../../../../system/alert/exception.alert';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly exceptionAlert: ExceptionAlert) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(HttpStatus.OK).json({
      result: 'failed',
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });

    this.exceptionAlert.alert(exception);
  }
}
