import { Test, TestingModule } from '@nestjs/testing';
import { RequestLoggingInterceptor } from './request.logging.intercpetor';
import { LoggerService } from '../../logger/logger.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { createMock } from '@golevelup/ts-jest';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockLoggerService = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestLoggingInterceptor,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    interceptor = module.get<RequestLoggingInterceptor>(
      RequestLoggingInterceptor,
    );
    loggerService = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request completion with timing', (done) => {
    // Arrange
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    // Act
    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        // Assert
        expect(value).toBe('test response');
        expect(loggerService.info).toHaveBeenCalledWith(
          expect.stringMatching(/GET \/api\/test completed in \d+ms/),
        );
        done();
      },
      error: done,
    });
  });

  it('should handle different HTTP methods', (done) => {
    // Arrange
    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/submit',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('success'),
    } as CallHandler;

    // Act
    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        // Assert
        expect(value).toBe('success');
        expect(loggerService.info).toHaveBeenCalledWith(
          expect.stringMatching(/POST \/api\/submit completed in \d+ms/),
        );
        done();
      },
      error: done,
    });
  });

  it('should handle different URLs', (done) => {
    // Arrange
    const mockRequest = {
      method: 'PUT',
      originalUrl: '/api/users/123',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('updated'),
    } as CallHandler;

    // Act
    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        // Assert
        expect(value).toBe('updated');
        expect(loggerService.info).toHaveBeenCalledWith(
          expect.stringMatching(/PUT \/api\/users\/123 completed in \d+ms/),
        );
        done();
      },
      error: done,
    });
  });
});
