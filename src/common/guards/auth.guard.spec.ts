import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;
  let mockContext: ExecutionContext;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    configService = module.get(ConfigService);
    loggerService = module.get(LoggerService);

    // Setup default mock context
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return false when no authorization header is provided', () => {
    // Arrange
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
    expect(loggerService.error).toHaveBeenCalledWith(
      'No authorization header provided',
    );
  });

  it('should return false when authorization header is empty', () => {
    // Arrange
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: '' },
        }),
      }),
    } as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
    expect(loggerService.error).toHaveBeenCalledWith(
      'No authorization header provided',
    );
  });

  it('should return false when authorization header has no token part', () => {
    // Arrange
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer' },
        }),
      }),
    } as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
    expect(loggerService.error).toHaveBeenCalledWith('No token provided');
  });

  it('should return false when JWT_SECRET is not configured', () => {
    // Arrange
    configService.get.mockReturnValue(undefined);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid-token' },
        }),
      }),
    } as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
    expect(loggerService.error).toHaveBeenCalledWith('JWT_SECRET is not set');
  });

  it('should return false when JWT verification fails', () => {
    // Arrange
    const jwt = require('jsonwebtoken');
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });
    configService.get.mockReturnValue('test-secret');

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer invalid-token' },
        }),
      }),
    } as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
  });

  it('should return true when JWT verification succeeds', () => {
    // Arrange
    const jwt = require('jsonwebtoken');
    jwt.verify.mockImplementation(() => ({ userId: '123' }));
    configService.get.mockReturnValue('test-secret');

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid-token' },
        }),
      }),
    } as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
  });
});
