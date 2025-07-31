import { Test, TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from './http.exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: Response;
  let mockRequest: Request;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    // Setup mocks
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    mockRequest = {
      url: '/api/test',
    } as unknown as Request;

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should always return HTTP 200 status', () => {
    // Arrange
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    // Act
    filter.catch(exception, mockHost);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('should return correct response format', () => {
    // Arrange
    const exception = new HttpException(
      'Validation failed',
      HttpStatus.BAD_REQUEST,
    );

    // Act
    filter.catch(exception, mockHost);

    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith({
      result: 'failed',
      message: 'Validation failed',
      timestamp: expect.any(String) as string,
      path: '/api/test',
    });
  });

  it('should handle different exception messages', () => {
    // Arrange
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    // Act
    filter.catch(exception, mockHost);

    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith({
      result: 'failed',
      message: 'Not found',
      timestamp: expect.any(String) as string,
      path: '/api/test',
    });
  });

  it('should include request path in response', () => {
    // Arrange
    mockRequest.url = '/api/users/123';
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    // Act
    filter.catch(exception, mockHost);

    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith({
      result: 'failed',
      message: 'Forbidden',
      timestamp: expect.any(String) as string,
      path: '/api/users/123',
    });
  });

  it('should generate ISO timestamp', () => {
    // Arrange
    const exception = new HttpException(
      'Server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    // Act
    filter.catch(exception, mockHost);

    // Assert
    const callArgs = (
      (mockResponse.json as jest.Mock).mock.calls[0] as any[]
    )[0] as {
      timestamp: string;
    };
    expect(callArgs.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});
