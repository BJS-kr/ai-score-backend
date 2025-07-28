import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) {
      this.logger.error('No authorization header provided');
      return false;
    }

    const token = request.headers.authorization.split(' ')[1];

    if (!token) {
      this.logger.error('No token provided');
      return false;
    }
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not set');
      return false;
    }

    try {
      jwt.verify(token, jwtSecret);
    } catch {
      return false;
    }

    return true;
  }
}
