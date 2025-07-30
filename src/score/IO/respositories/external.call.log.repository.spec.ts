import { Test, TestingModule } from '@nestjs/testing';
import { ExternalCallLogRepository } from './external.call.log.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

describe('ExternalCallLogRepository', () => {
  let repository: ExternalCallLogRepository;
  let writeClient: any;

  const mockLogData = {
    traceId: 'trace-123',
    context: 'AZURE_OPENAI',
    success: true,
    latency: 1500,
    taskName: 'getReviewResponse',
    submissionId: 'submission-123',
    description: 'Get review response from Azure OpenAI',
    requestData: {
      prompt: 'Review this essay',
    } as unknown as Prisma.NullableJsonNullValueInput,
    responseData: {
      score: 8,
      feedback: 'Good essay',
    } as unknown as Prisma.NullableJsonNullValueInput,
    errorMessage: undefined,
  };

  const mockCreatedLog = {
    id: 'log-123',
    traceId: 'trace-123',
    submissionId: 'submission-123',
    context: 'AZURE_OPENAI',
    success: true,
    latency: 1500,
    taskName: 'getReviewResponse',
    description: 'Get review response from Azure OpenAI',
    requestData: {
      prompt: 'Review this essay',
    } as unknown as Prisma.NullableJsonNullValueInput,
    responseData: {
      score: 8,
      feedback: 'Good essay',
    } as unknown as Prisma.NullableJsonNullValueInput,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockWriteClient = {
      tx: {
        submissionExternalCallLog: {
          upsert: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalCallLogRepository,
        {
          provide: TransactionHost,
          useValue: mockWriteClient,
        },
      ],
    }).compile();

    repository = module.get<ExternalCallLogRepository>(
      ExternalCallLogRepository,
    );
    writeClient = module.get(TransactionHost);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('#createLog', () => {
    it('should create new log when traceId does not exist', async () => {
      // Arrange
      writeClient.tx.submissionExternalCallLog.upsert.mockResolvedValue(
        mockCreatedLog,
      );

      // Act
      const result = await repository.createLog(mockLogData);

      // Assert
      expect(result).toEqual(mockCreatedLog);
      expect(
        writeClient.tx.submissionExternalCallLog.upsert,
      ).toHaveBeenCalledWith({
        where: { traceId: 'trace-123' },
        update: {
          submissionId: 'submission-123',
          context: 'AZURE_OPENAI',
          success: true,
          latency: 1500,
          taskName: 'getReviewResponse',
          description: 'Get review response from Azure OpenAI',
          requestData: { prompt: 'Review this essay' },
          responseData: { score: 8, feedback: 'Good essay' },
          errorMessage: undefined,
        },
        create: {
          traceId: 'trace-123',
          submissionId: 'submission-123',
          context: 'AZURE_OPENAI',
          success: true,
          latency: 1500,
          taskName: 'getReviewResponse',
          description: 'Get review response from Azure OpenAI',
          requestData: { prompt: 'Review this essay' },
          responseData: { score: 8, feedback: 'Good essay' },
          errorMessage: undefined,
        },
      });
    });

    it('should update existing log when traceId exists', async () => {
      // Arrange
      const updatedLog = {
        ...mockCreatedLog,
        success: false,
        errorMessage: 'API Error',
      };
      writeClient.tx.submissionExternalCallLog.upsert.mockResolvedValue(
        updatedLog,
      );

      const updateData = {
        ...mockLogData,
        success: false,
        errorMessage: 'API Error',
        requestData: undefined,
        responseData: undefined,
      };

      // Act
      const result = await repository.createLog(updateData);

      // Assert
      expect(result).toEqual(updatedLog);
      expect(
        writeClient.tx.submissionExternalCallLog.upsert,
      ).toHaveBeenCalledWith({
        where: { traceId: 'trace-123' },
        update: {
          submissionId: 'submission-123',
          context: 'AZURE_OPENAI',
          success: false,
          latency: 1500,
          taskName: 'getReviewResponse',
          description: 'Get review response from Azure OpenAI',
          requestData: undefined,
          responseData: undefined,
          errorMessage: 'API Error',
        },
        create: {
          traceId: 'trace-123',
          submissionId: 'submission-123',
          context: 'AZURE_OPENAI',
          success: false,
          latency: 1500,
          taskName: 'getReviewResponse',
          description: 'Get review response from Azure OpenAI',
          requestData: undefined,
          responseData: undefined,
          errorMessage: 'API Error',
        },
      });
    });

    it('should handle minimal log data', async () => {
      // Arrange
      const minimalLogData = {
        traceId: 'trace-456',
        context: 'AZURE_BLOB',
        success: true,
        latency: 500,
        taskName: 'uploadFile',
        submissionId: 'submission-456',
      };

      const minimalCreatedLog = {
        id: 'log-456',
        traceId: 'trace-456',
        submissionId: 'submission-456',
        context: 'AZURE_BLOB',
        success: true,
        latency: 500,
        taskName: 'uploadFile',
        description: null,
        requestData: null,
        responseData: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      writeClient.tx.submissionExternalCallLog.upsert.mockResolvedValue(
        minimalCreatedLog,
      );

      // Act
      const result = await repository.createLog(minimalLogData);

      // Assert
      expect(result).toEqual(minimalCreatedLog);
      expect(
        writeClient.tx.submissionExternalCallLog.upsert,
      ).toHaveBeenCalledWith({
        where: { traceId: 'trace-456' },
        update: {
          submissionId: 'submission-456',
          context: 'AZURE_BLOB',
          success: true,
          latency: 500,
          taskName: 'uploadFile',
          description: undefined,
          requestData: undefined,
          responseData: undefined,
          errorMessage: undefined,
        },
        create: {
          traceId: 'trace-456',
          submissionId: 'submission-456',
          context: 'AZURE_BLOB',
          success: true,
          latency: 500,
          taskName: 'uploadFile',
          description: undefined,
          requestData: undefined,
          responseData: undefined,
          errorMessage: undefined,
        },
      });
    });

    it('should handle failed operations', async () => {
      // Arrange
      const failedLogData = {
        traceId: 'trace-789',
        context: 'AZURE_OPENAI',
        success: false,
        latency: 3000,
        taskName: 'getReviewResponse',
        submissionId: 'submission-789',
        description: 'Failed to get review response',
        errorMessage: 'Connection timeout',
      };

      const failedCreatedLog = {
        id: 'log-789',
        traceId: 'trace-789',
        submissionId: 'submission-789',
        context: 'AZURE_OPENAI',
        success: false,
        latency: 3000,
        taskName: 'getReviewResponse',
        description: 'Failed to get review response',
        requestData: null,
        responseData: null,
        errorMessage: 'Connection timeout',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      writeClient.tx.submissionExternalCallLog.upsert.mockResolvedValue(
        failedCreatedLog,
      );

      // Act
      const result = await repository.createLog(failedLogData);

      // Assert
      expect(result).toEqual(failedCreatedLog);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Connection timeout');
      expect(
        writeClient.tx.submissionExternalCallLog.upsert,
      ).toHaveBeenCalledWith({
        where: { traceId: 'trace-789' },
        update: {
          submissionId: 'submission-789',
          context: 'AZURE_OPENAI',
          success: false,
          latency: 3000,
          taskName: 'getReviewResponse',
          description: 'Failed to get review response',
          requestData: undefined,
          responseData: undefined,
          errorMessage: 'Connection timeout',
        },
        create: {
          traceId: 'trace-789',
          submissionId: 'submission-789',
          context: 'AZURE_OPENAI',
          success: false,
          latency: 3000,
          taskName: 'getReviewResponse',
          description: 'Failed to get review response',
          requestData: undefined,
          responseData: undefined,
          errorMessage: 'Connection timeout',
        },
      });
    });

    it('should handle complex JSON data', async () => {
      // Arrange
      const complexLogData = {
        traceId: 'trace-complex',
        context: 'AZURE_OPENAI',
        success: true,
        latency: 2000,
        taskName: 'processVideo',
        submissionId: 'submission-complex',
        description: 'Process video with complex data',
        requestData: {
          videoUrl: 'https://example.com/video.mp4',
          options: {
            quality: 'high',
            format: 'mp4',
            resolution: { width: 1920, height: 1080 },
          },
          metadata: {
            duration: 120,
            size: 1024000,
            codec: 'h264',
          },
        } as unknown as Prisma.NullableJsonNullValueInput,
        responseData: {
          processedUrl: 'https://example.com/processed.mp4',
          stats: {
            processingTime: 45.2,
            outputSize: 512000,
            quality: 'high',
          },
          thumbnails: [
            { url: 'https://example.com/thumb1.jpg', time: 0 },
            { url: 'https://example.com/thumb2.jpg', time: 60 },
          ],
        } as unknown as Prisma.NullableJsonNullValueInput,
      };

      const complexCreatedLog = {
        id: 'log-complex',
        ...complexLogData,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      writeClient.tx.submissionExternalCallLog.upsert.mockResolvedValue(
        complexCreatedLog,
      );

      // Act
      const result = await repository.createLog(complexLogData);

      // Assert
      expect(result).toEqual(complexCreatedLog);
      expect(
        writeClient.tx.submissionExternalCallLog.upsert,
      ).toHaveBeenCalledWith({
        where: { traceId: 'trace-complex' },
        update: {
          submissionId: 'submission-complex',
          context: 'AZURE_OPENAI',
          success: true,
          latency: 2000,
          taskName: 'processVideo',
          description: 'Process video with complex data',
          requestData: complexLogData.requestData,
          responseData: complexLogData.responseData,
          errorMessage: undefined,
        },
        create: {
          traceId: 'trace-complex',
          submissionId: 'submission-complex',
          context: 'AZURE_OPENAI',
          success: true,
          latency: 2000,
          taskName: 'processVideo',
          description: 'Process video with complex data',
          requestData: complexLogData.requestData,
          responseData: complexLogData.responseData,
          errorMessage: undefined,
        },
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      writeClient.tx.submissionExternalCallLog.upsert.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.createLog(mockLogData)).rejects.toThrow(
        'Database connection failed',
      );

      expect(
        writeClient.tx.submissionExternalCallLog.upsert,
      ).toHaveBeenCalledWith({
        where: { traceId: 'trace-123' },
        update: {
          submissionId: 'submission-123',
          context: 'AZURE_OPENAI',
          success: true,
          latency: 1500,
          taskName: 'getReviewResponse',
          description: 'Get review response from Azure OpenAI',
          requestData: { prompt: 'Review this essay' },
          responseData: { score: 8, feedback: 'Good essay' },
          errorMessage: undefined,
        },
        create: {
          traceId: 'trace-123',
          submissionId: 'submission-123',
          context: 'AZURE_OPENAI',
          success: true,
          latency: 1500,
          taskName: 'getReviewResponse',
          description: 'Get review response from Azure OpenAI',
          requestData: { prompt: 'Review this essay' },
          responseData: { score: 8, feedback: 'Good essay' },
          errorMessage: undefined,
        },
      });
    });

    it('should handle different contexts', async () => {
      // Arrange
      const contexts = ['AZURE_OPENAI', 'AZURE_BLOB', 'FFMPEG', 'CUSTOM_API'];

      for (const context of contexts) {
        const contextLogData = {
          ...mockLogData,
          traceId: `trace-${context}`,
          context,
          taskName: `task-${context.toLowerCase()}`,
        };

        const contextCreatedLog = {
          ...mockCreatedLog,
          traceId: `trace-${context}`,
          context,
          taskName: `task-${context.toLowerCase()}`,
        };

        writeClient.tx.submissionExternalCallLog.upsert.mockResolvedValue(
          contextCreatedLog,
        );

        // Act
        const result = await repository.createLog(contextLogData);

        // Assert
        expect(result.context).toBe(context);
        expect(result.taskName).toBe(`task-${context.toLowerCase()}`);
        expect(
          writeClient.tx.submissionExternalCallLog.upsert,
        ).toHaveBeenCalledWith({
          where: { traceId: `trace-${context}` },
          update: expect.objectContaining({
            context,
            taskName: `task-${context.toLowerCase()}`,
          }),
          create: expect.objectContaining({
            traceId: `trace-${context}`,
            context,
            taskName: `task-${context.toLowerCase()}`,
          }),
        });
      }
    });
  });
});
