import { Test, TestingModule } from '@nestjs/testing';
import { ExternalLogger } from './external.logger';
import { ExternalCallLogRepository } from '../../IO/respositories/external.call.log.repository';
import { LoggerService } from 'src/common/logger/logger.service';
import { LogContext } from 'src/common/decorators/param/log.context';

describe('ExternalLogger', () => {
  let service: ExternalLogger;
  let externalCallLogRepository: jest.Mocked<ExternalCallLogRepository>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockLogContext: LogContext = {
    traceId: 'test-trace-id',
    requestUri: '/v1/submissions',
    startTime: Date.now(),
    logInfo: {
      submissionId: 'test-submission-id',
    },
  };

  beforeEach(async () => {
    const mockExternalCallLogRepository = {
      createLog: jest.fn(),
    };

    const mockLoggerService = {
      trace: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalLogger,
        {
          provide: ExternalCallLogRepository,
          useValue: mockExternalCallLogRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<ExternalLogger>(ExternalLogger);
    externalCallLogRepository = module.get(ExternalCallLogRepository);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logExternalCall', () => {
    it('should successfully log external call', async () => {
      // Arrange
      const duration = 1500;
      const isSuccess = true;
      const serviceName = 'AZURE_OPENAI';
      const operationName = 'AZURE_OPENAI_REVIEW';
      const message = 'Successfully called Azure OpenAI';

      const mockCreatedLog = {
        id: 'log-id-1',
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 1500,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Successfully called Azure OpenAI',
        requestData: null,
        responseData: null,
        errorMessage: null,
        createdAt: new Date(),
      };

      externalCallLogRepository.createLog.mockResolvedValue(mockCreatedLog);

      // Act
      await service.logExternalCall(
        mockLogContext,
        duration,
        isSuccess,
        serviceName,
        operationName,
        message,
      );

      // Assert
      expect(externalCallLogRepository.createLog).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 1500,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Successfully called Azure OpenAI',
      });
      expect(loggerService.trace).toHaveBeenCalledWith(
        'Successfully called Azure OpenAI',
        'AZURE_OPENAI',
      );
    });

    it('should log failed external call', async () => {
      // Arrange
      const duration = 2000;
      const isSuccess = false;
      const serviceName = 'AZURE_BLOB_STORAGE';
      const operationName = 'AZURE_BLOB_STORAGE_UPLOAD';
      const message = 'Failed to upload file to Azure Blob Storage';

      const mockCreatedLog = {
        id: 'log-id-2',
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_BLOB_STORAGE',
        success: false,
        latency: 2000,
        taskName: 'AZURE_BLOB_STORAGE_UPLOAD',
        description: 'Failed to upload file to Azure Blob Storage',
        requestData: null,
        responseData: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      externalCallLogRepository.createLog.mockResolvedValue(mockCreatedLog);

      // Act
      await service.logExternalCall(
        mockLogContext,
        duration,
        isSuccess,
        serviceName,
        operationName,
        message,
      );

      // Assert
      expect(externalCallLogRepository.createLog).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_BLOB_STORAGE',
        success: false,
        latency: 2000,
        taskName: 'AZURE_BLOB_STORAGE_UPLOAD',
        description: 'Failed to upload file to Azure Blob Storage',
      });
      expect(loggerService.trace).toHaveBeenCalledWith(
        'Failed to upload file to Azure Blob Storage',
        'AZURE_BLOB_STORAGE',
      );
    });

    it('should handle zero duration', async () => {
      // Arrange
      const duration = 0;
      const isSuccess = true;
      const serviceName = 'AZURE_OPENAI';
      const operationName = 'AZURE_OPENAI_REVIEW';
      const message = 'Successfully called Azure OpenAI';

      const mockCreatedLog = {
        id: 'log-id-3',
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 0,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Successfully called Azure OpenAI',
        requestData: null,
        responseData: null,
        errorMessage: null,
        createdAt: new Date(),
      };

      externalCallLogRepository.createLog.mockResolvedValue(mockCreatedLog);

      // Act
      await service.logExternalCall(
        mockLogContext,
        duration,
        isSuccess,
        serviceName,
        operationName,
        message,
      );

      // Assert
      expect(externalCallLogRepository.createLog).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 0,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Successfully called Azure OpenAI',
      });
    });

    it('should handle very long duration', async () => {
      // Arrange
      const duration = 30000; // 30 seconds
      const isSuccess = false;
      const serviceName = 'AZURE_OPENAI';
      const operationName = 'AZURE_OPENAI_REVIEW';
      const message = 'Timeout occurred';

      const mockCreatedLog = {
        id: 'log-id-4',
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: false,
        latency: 30000,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Timeout occurred',
        requestData: null,
        responseData: null,
        errorMessage: 'Timeout occurred',
        createdAt: new Date(),
      };

      externalCallLogRepository.createLog.mockResolvedValue(mockCreatedLog);

      // Act
      await service.logExternalCall(
        mockLogContext,
        duration,
        isSuccess,
        serviceName,
        operationName,
        message,
      );

      // Assert
      expect(externalCallLogRepository.createLog).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: false,
        latency: 30000,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Timeout occurred',
      });
    });

    it('should handle empty message', async () => {
      // Arrange
      const duration = 500;
      const isSuccess = true;
      const serviceName = 'AZURE_OPENAI';
      const operationName = 'AZURE_OPENAI_REVIEW';
      const message = '';

      const mockCreatedLog = {
        id: 'log-id-5',
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 500,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: '',
        requestData: null,
        responseData: null,
        errorMessage: null,
        createdAt: new Date(),
      };

      externalCallLogRepository.createLog.mockResolvedValue(mockCreatedLog);

      // Act
      await service.logExternalCall(
        mockLogContext,
        duration,
        isSuccess,
        serviceName,
        operationName,
        message,
      );

      // Assert
      expect(externalCallLogRepository.createLog).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 500,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: '',
      });
    });

    it('should handle special characters in message', async () => {
      // Arrange
      const duration = 1000;
      const isSuccess = false;
      const serviceName = 'AZURE_OPENAI';
      const operationName = 'AZURE_OPENAI_REVIEW';
      const message = 'Error: Invalid JSON format & special chars: <>&"\'';

      const mockCreatedLog = {
        id: 'log-id-6',
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: false,
        latency: 1000,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Error: Invalid JSON format & special chars: <>&"\'',
        requestData: null,
        responseData: null,
        errorMessage: 'Error: Invalid JSON format & special chars: <>&"\'',
        createdAt: new Date(),
      };

      externalCallLogRepository.createLog.mockResolvedValue(mockCreatedLog);

      // Act
      await service.logExternalCall(
        mockLogContext,
        duration,
        isSuccess,
        serviceName,
        operationName,
        message,
      );

      // Assert
      expect(externalCallLogRepository.createLog).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        submissionId: 'test-submission-id',
        context: 'AZURE_OPENAI',
        success: false,
        latency: 1000,
        taskName: 'AZURE_OPENAI_REVIEW',
        description: 'Error: Invalid JSON format & special chars: <>&"\'',
      });
    });
  });
});
