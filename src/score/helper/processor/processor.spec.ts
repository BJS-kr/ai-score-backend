import { Test, TestingModule } from '@nestjs/testing';
import { Processor } from './processor';
import { LoggerService } from 'src/common/logger/logger.service';
import { SubmissionRepository } from '../../IO/respositories/submission.respository';
import {
  LogContext,
  ReviewLogInfo,
} from 'src/common/decorators/param/log-context/log.context';
import { isSuccess } from './strict.return';
import { createMock } from '@golevelup/ts-jest';

describe('Processor', () => {
  let service: Processor;
  let loggerService: jest.Mocked<LoggerService>;
  let submissionRepository: jest.Mocked<SubmissionRepository>;

  const mockLogContext: LogContext<ReviewLogInfo> = {
    traceId: 'test-trace-id',
    requestUri: '/v1/submissions',
    startTime: Date.now(),
    logInfo: {
      submissionId: 'test-submission-id',
    },
  };

  beforeEach(async () => {
    const mockLoggerService = createMock<LoggerService>();
    const mockSubmissionRepository = createMock<SubmissionRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Processor,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: SubmissionRepository,
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile();

    service = module.get<Processor>(Processor);
    loggerService = module.get(LoggerService);
    submissionRepository = module.get(SubmissionRepository);

    // Reset mockLogContext to prevent test interference
    mockLogContext.logInfo = {
      submissionId: 'test-submission-id',
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('accumulateContextInfo', () => {
    it('should merge new info with existing context info', () => {
      // Arrange
      const newInfo = {
        score: 8,
        feedback: 'Good essay',
      };

      // Act
      service.accumulateContextInfo(mockLogContext, newInfo);

      // Assert
      expect(mockLogContext.logInfo).toEqual({
        submissionId: 'test-submission-id',
        score: 8,
        feedback: 'Good essay',
      });
    });

    it('should overwrite existing values when merging', () => {
      // Arrange
      mockLogContext.logInfo = {
        submissionId: 'test-submission-id',
        score: 7,
      };
      const newInfo = {
        score: 8,
        feedback: 'Good essay',
      };

      // Act
      service.accumulateContextInfo(mockLogContext, newInfo);

      // Assert
      expect(mockLogContext.logInfo).toEqual({
        submissionId: 'test-submission-id',
        score: 8, // Should be overwritten
        feedback: 'Good essay',
      });
    });
  });

  describe('handleFail', () => {
    it('should log internal error and fail submission', async () => {
      // Arrange
      const internalError = 'Internal processing error';
      const externalError = 'Processing failed';
      submissionRepository.failSubmission.mockResolvedValue(undefined);

      // Act
      const result = await service.handleFail({
        internalError,
        externalError,
        logContext: mockLogContext,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe(externalError);
      }
      expect(loggerService.trace).toHaveBeenCalledWith(internalError);
      expect(submissionRepository.failSubmission).toHaveBeenCalledWith(
        mockLogContext.logInfo.submissionId,
        mockLogContext.traceId,
        mockLogContext.startTime,
        externalError,
      );
    });
  });

  describe('process', () => {
    it('should process successful result and accumulate context info', async () => {
      // Arrange
      const source = {
        success: true as const,
        data: {
          score: 8,
          feedback: 'Good essay',
          highlights: ['word1'],
        },
      };
      const keys: (keyof typeof source.data)[] = ['score', 'feedback'];

      // Act
      const result = await service.process(
        source,
        mockLogContext,
        keys,
        'review processing',
      );

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(source.data);
      }
      expect(mockLogContext.logInfo).toEqual({
        submissionId: 'test-submission-id',
        score: 8,
        feedback: 'Good essay',
      });
    });

    it('should handle failed result and call handleFail', async () => {
      // Arrange
      const source = {
        success: false as const,
        error: 'Processing failed',
      };
      const keys: string[] = ['score', 'feedback'];
      submissionRepository.failSubmission.mockResolvedValue(undefined);

      // Act
      const result = await service.process(
        source,
        mockLogContext,
        keys,
        'review processing',
      );

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('review processing failed');
      }
      expect(loggerService.trace).toHaveBeenCalledWith(
        expect.stringContaining(
          'review processing failed for submission test-submission-id',
        ),
      );
      expect(submissionRepository.failSubmission).toHaveBeenCalledWith(
        mockLogContext.logInfo.submissionId,
        mockLogContext.traceId,
        mockLogContext.startTime,
        'review processing failed',
      );
    });

    it('should accumulate multiple keys from successful result', async () => {
      // Arrange
      const source = {
        success: true as const,
        data: {
          localVideoPath: '/path/to/video.mp4',
          localAudioPath: '/path/to/audio.mp3',
          originalDuration: 60,
          processedDuration: 60,
        },
      };
      const keys: (keyof typeof source.data)[] = [
        'localVideoPath',
        'localAudioPath',
      ];

      // Act
      const result = await service.process(
        source,
        mockLogContext,
        keys,
        'video processing',
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockLogContext.logInfo).toEqual({
        submissionId: 'test-submission-id',
        localVideoPath: '/path/to/video.mp4',
        localAudioPath: '/path/to/audio.mp3',
      });
    });

    it('should handle empty keys array', async () => {
      // Arrange
      const source = {
        success: true as const,
        data: {
          score: 8,
          feedback: 'Good essay',
        },
      };
      const keys: (keyof typeof source.data)[] = [];

      // Act
      const result = await service.process(
        source,
        mockLogContext,
        keys,
        'processing',
      );

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(source.data);
      }
      // Should not accumulate any context info
      expect(mockLogContext.logInfo).toEqual({
        submissionId: 'test-submission-id',
      });
    });
  });
});
