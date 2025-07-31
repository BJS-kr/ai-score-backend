import { Test, TestingModule } from '@nestjs/testing';
import { RevisionService } from './revision.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { RevisionRepository } from 'src/score/IO/respositories/revision.repository';
import { Processor } from 'src/score/helper/processor/processor';
import { LoggerService } from 'src/common/logger/logger.service';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { SubmissionResult } from '../submissions/interfaces/submission.result';
import { MediaType, RevisionStatus } from '@prisma/client';
import { isSuccess } from 'src/score/helper/processor/strict.return';
import { createMock } from '@golevelup/ts-jest';
import { ReviewService } from '../reviews/review.service';

// Mock the @Transactional decorator to prevent issues in tests
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      return descriptor;
    },
}));

describe('RevisionReviewService', () => {
  let service: RevisionService;
  let submissionsService: jest.Mocked<SubmissionsService>;
  let submissionRepository: jest.Mocked<SubmissionRepository>;
  let revisionRepository: jest.Mocked<RevisionRepository>;
  let processor: jest.Mocked<Processor>;
  let reviewService: jest.Mocked<ReviewService>;

  const mockLogContext: LogContext = {
    traceId: 'test-trace-id',
    requestUri: '/revisions',
    startTime: Date.now(),
    logInfo: {
      submissionId: 'submission-123',
    },
  };

  const mockSubmission = {
    id: 'submission-123',
    studentId: 'student-123',
    studentName: 'John Doe',
    componentType: 'Essay Writing',
    submitText: 'This is a test essay.',
    retried: false,
    status: 'PENDING' as any,
    score: null,
    feedback: null,
    highlights: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRevision = {
    id: 'revision-123',
    submissionId: 'submission-123',
    status: RevisionStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVideoMedia = {
    id: 'video-123',
    submissionId: 'submission-123',
    mediaType: MediaType.VIDEO,
    fileUrl: 'https://test.blob.core.windows.net/video.mp4',
    sasUrl: 'https://test.blob.core.windows.net/video.mp4?sas=token',
    fileSize: BigInt(1024 * 1024),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAudioMedia = {
    id: 'audio-123',
    submissionId: 'submission-123',
    mediaType: MediaType.AUDIO,
    fileUrl: 'https://test.blob.core.windows.net/audio.mp3',
    sasUrl: 'https://test.blob.core.windows.net/audio.mp3?sas=token',
    fileSize: BigInt(512 * 1024),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmissionResult: SubmissionResult = {
    score: 85,
    feedback: 'Good essay with room for improvement.',
    highlights: ['good', 'improvement'],
    submitText: 'This is a test essay.',
    highlightedText:
      'This is a <b>good</b> essay with room for <b>improvement</b>.',
    videoUrl: 'https://test.blob.core.windows.net/video.mp4',
    audioUrl: 'https://test.blob.core.windows.net/audio.mp3',
    message: 'Review completed successfully',
    studentId: 'student-123',
    studentName: 'John Doe',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisionService,
        {
          provide: SubmissionsService,
          useValue: createMock<SubmissionsService>(),
        },
        {
          provide: SubmissionRepository,
          useValue: createMock<SubmissionRepository>(),
        },
        {
          provide: RevisionRepository,
          useValue: createMock<RevisionRepository>(),
        },
        {
          provide: Processor,
          useValue: createMock<Processor>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: ReviewService,
          useValue: createMock<ReviewService>(),
        },
      ],
    }).compile();

    service = module.get<RevisionService>(RevisionService);
    submissionsService = module.get(SubmissionsService);
    submissionRepository = module.get(SubmissionRepository);
    revisionRepository = module.get(RevisionRepository);
    processor = module.get(Processor);
    reviewService = module.get(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#reviseSubmission', () => {
    it('should successfully revise a submission', async () => {
      // Arrange
      submissionRepository.getSubmission.mockResolvedValue(mockSubmission);
      revisionRepository.createRevision.mockResolvedValue(mockRevision);
      submissionRepository.updateSubmissionRetried.mockResolvedValue(
        mockSubmission,
      );
      submissionRepository.getSubmissionMedia
        .mockResolvedValueOnce(mockVideoMedia)
        .mockResolvedValueOnce(mockAudioMedia);
      reviewService.review.mockResolvedValue({
        success: true as const,
        data: mockSubmissionResult,
      });
      revisionRepository.updateRevision.mockResolvedValue({
        ...mockRevision,
        status: RevisionStatus.COMPLETED,
      });

      // Act
      const result = await service.reviseSubmission(mockLogContext);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockSubmissionResult);
      }

      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        mockLogContext.logInfo.submissionId,
      );
      expect(revisionRepository.createRevision).toHaveBeenCalledWith(
        mockLogContext,
      );
      expect(submissionRepository.updateSubmissionRetried).toHaveBeenCalledWith(
        mockSubmission.id,
      );
      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        mockSubmission.id,
        MediaType.VIDEO,
      );
      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        mockSubmission.id,
        MediaType.AUDIO,
      );
      expect(processor.accumulateContextInfo).toHaveBeenCalledWith(
        mockLogContext,
        {
          videoSasUrl: mockVideoMedia.sasUrl,
          audioSasUrl: mockAudioMedia.sasUrl,
        },
      );
      expect(reviewService.review).toHaveBeenCalledWith(
        mockSubmission.submitText,
        mockSubmission.studentId,
        mockSubmission.studentName,
        mockVideoMedia.sasUrl,
        mockAudioMedia.sasUrl,
        mockLogContext,
      );
      expect(revisionRepository.updateRevision).toHaveBeenCalledWith(
        mockRevision.id,
        RevisionStatus.COMPLETED,
      );
    });

    it('should return error when submission not found', async () => {
      // Arrange
      submissionRepository.getSubmission.mockResolvedValue(null);

      // Act
      const result = await service.reviseSubmission(mockLogContext);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Submission not found');
      }

      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        mockLogContext.logInfo.submissionId,
      );
      expect(revisionRepository.createRevision).not.toHaveBeenCalled();
      expect(
        submissionRepository.updateSubmissionRetried,
      ).not.toHaveBeenCalled();
    });

    it('should return error when video media not found', async () => {
      // Arrange
      submissionRepository.getSubmission.mockResolvedValue(mockSubmission);
      revisionRepository.createRevision.mockResolvedValue(mockRevision);
      submissionRepository.updateSubmissionRetried.mockResolvedValue(
        mockSubmission,
      );
      submissionRepository.getSubmissionMedia.mockResolvedValue(null);

      // Act
      const result = await service.reviseSubmission(mockLogContext);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Video media not found');
      }

      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        mockSubmission.id,
        MediaType.VIDEO,
      );
      expect(submissionsService.newSubmission).not.toHaveBeenCalled();
    });

    it('should return error when audio media not found', async () => {
      // Arrange
      submissionRepository.getSubmission.mockResolvedValue(mockSubmission);
      revisionRepository.createRevision.mockResolvedValue(mockRevision);
      submissionRepository.updateSubmissionRetried.mockResolvedValue(
        mockSubmission,
      );
      submissionRepository.getSubmissionMedia
        .mockResolvedValueOnce(mockVideoMedia)
        .mockResolvedValueOnce(null);

      // Act
      const result = await service.reviseSubmission(mockLogContext);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Audio media not found');
      }

      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        mockSubmission.id,
        MediaType.AUDIO,
      );
      expect(submissionsService.newSubmission).not.toHaveBeenCalled();
    });

    it('should handle submission review failure and update revision status', async () => {
      // Arrange
      const reviewError = 'Review processing failed';
      submissionRepository.getSubmission.mockResolvedValue(mockSubmission);
      revisionRepository.createRevision.mockResolvedValue(mockRevision);
      submissionRepository.updateSubmissionRetried.mockResolvedValue(
        mockSubmission,
      );
      submissionRepository.getSubmissionMedia
        .mockResolvedValueOnce(mockVideoMedia)
        .mockResolvedValueOnce(mockAudioMedia);
      reviewService.review.mockResolvedValue({
        success: false as const,
        error: reviewError,
      });
      revisionRepository.updateRevision.mockResolvedValue({
        ...mockRevision,
        status: RevisionStatus.FAILED,
      });

      // Act
      const result = await service.reviseSubmission(mockLogContext);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe(reviewError);
      }

      expect(reviewService.review).toHaveBeenCalledWith(
        mockSubmission.submitText,
        mockSubmission.studentId,
        mockSubmission.studentName,
        mockVideoMedia.sasUrl,
        mockAudioMedia.sasUrl,
        mockLogContext,
      );
      expect(revisionRepository.updateRevision).toHaveBeenCalledWith(
        mockRevision.id,
        RevisionStatus.FAILED,
      );
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      submissionRepository.getSubmission.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.reviseSubmission(mockLogContext)).rejects.toThrow(
        'Database connection failed',
      );

      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        mockLogContext.logInfo.submissionId,
      );
    });
  });

  describe('#getSubmissionMedias', () => {
    it('should successfully get submission medias', async () => {
      // Arrange
      const submissionId = 'submission-123';
      submissionRepository.getSubmissionMedia
        .mockResolvedValueOnce(mockVideoMedia)
        .mockResolvedValueOnce(mockAudioMedia);

      // Act
      const result = await (service as any).getSubmissionMedias(submissionId);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          videoSasUrl: mockVideoMedia.sasUrl,
          audioSasUrl: mockAudioMedia.sasUrl,
        });
      }

      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        submissionId,
        MediaType.VIDEO,
      );
      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        submissionId,
        MediaType.AUDIO,
      );
    });

    it('should return error when video media not found', async () => {
      // Arrange
      const submissionId = 'submission-123';
      submissionRepository.getSubmissionMedia.mockResolvedValue(null);

      // Act
      const result = await (service as any).getSubmissionMedias(submissionId);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Video media not found');
      }

      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        submissionId,
        MediaType.VIDEO,
      );
      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledTimes(1);
    });

    it('should return error when audio media not found', async () => {
      // Arrange
      const submissionId = 'submission-123';
      submissionRepository.getSubmissionMedia
        .mockResolvedValueOnce(mockVideoMedia)
        .mockResolvedValueOnce(null);

      // Act
      const result = await (service as any).getSubmissionMedias(submissionId);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Audio media not found');
      }

      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        submissionId,
        MediaType.VIDEO,
      );
      expect(submissionRepository.getSubmissionMedia).toHaveBeenCalledWith(
        submissionId,
        MediaType.AUDIO,
      );
    });
  });
});
