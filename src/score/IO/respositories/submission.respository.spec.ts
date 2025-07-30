import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionRepository } from './submission.respository';
import { PrismaService } from 'src/system/database/prisma.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log.context';
import {
  SubmissionStatus,
  SubmissionLogStatus,
  MediaType,
} from '@prisma/client';
import { createMock } from '@golevelup/ts-jest';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('SubmissionRepository', () => {
  let repository: SubmissionRepository;
  let mockReadClient: any;
  let mockWriteClient: any;

  const mockSubmissionDto: SubmissionRequestDto = {
    studentId: '123e4567-e89b-12d3-a456-426614174000',
    studentName: 'John Doe',
    componentType: 'Essay Writing',
    submitText: 'This is a test essay.',
  };

  const mockLogContext: LogContext<NewSubmissionLogInfo> = {
    traceId: 'test-trace-id',
    requestUri: '/v1/submissions',
    startTime: Date.now(),
    logInfo: {
      submissionId: '',
    },
  };

  beforeEach(async () => {
    mockReadClient = {
      submission: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      submissionMedia: {
        findFirst: jest.fn(),
      },
    };

    mockWriteClient = {
      tx: {
        submission: {
          create: jest.fn(),
          update: jest.fn(),
        },
        submissionLog: {
          create: jest.fn(),
          update: jest.fn(),
        },
        submissionMedia: {
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionRepository,
        {
          provide: PrismaService,
          useValue: mockReadClient,
        },
        {
          provide: TransactionHost,
          useValue: mockWriteClient,
        },
      ],
    }).compile();

    repository = module.get<SubmissionRepository>(SubmissionRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createSubmission', () => {
    it('should create submission and log', async () => {
      // Arrange
      mockWriteClient.tx.submission.create.mockResolvedValue({
        id: 'test-uuid-123',
      });
      mockWriteClient.tx.submissionLog.create.mockResolvedValue(undefined);

      // Act
      const result = await repository.createSubmission(
        mockSubmissionDto,
        mockLogContext,
      );

      // Assert
      expect(result).toBe('test-uuid-123');
      expect(mockWriteClient.tx.submission.create).toHaveBeenCalledWith({
        select: { id: true },
        data: {
          id: 'test-uuid-123',
          studentId: mockSubmissionDto.studentId,
          studentName: mockSubmissionDto.studentName,
          componentType: mockSubmissionDto.componentType,
          submitText: mockSubmissionDto.submitText,
        },
      });
      expect(mockWriteClient.tx.submissionLog.create).toHaveBeenCalledWith({
        data: {
          traceId: mockLogContext.traceId,
          submissionId: 'test-uuid-123',
          requestUri: mockLogContext.requestUri,
        },
      });
    });
  });

  describe('getSubmissions', () => {
    it('should get submissions with pagination and status filter', async () => {
      // Arrange
      const pagination = { skip: 0, take: 10 };
      const status = SubmissionStatus.COMPLETED;
      const mockSubmissions = [
        { id: 'sub-1', studentId: 'student-1' },
        { id: 'sub-2', studentId: 'student-2' },
      ];

      mockReadClient.submission.count.mockResolvedValue(2);
      mockReadClient.submission.findMany.mockResolvedValue(mockSubmissions);

      // Act
      const result = await repository.getSubmissions(pagination, status);

      // Assert
      expect(result).toEqual({
        total: 2,
        submissions: mockSubmissions,
      });
      expect(mockReadClient.submission.count).toHaveBeenCalledWith({
        where: { status },
      });
      expect(mockReadClient.submission.findMany).toHaveBeenCalledWith({
        ...pagination,
        where: { status },
      });
    });

    it('should get submissions without status filter', async () => {
      // Arrange
      const pagination = { skip: 0, take: 10 };
      const mockSubmissions = [{ id: 'sub-1' }];

      mockReadClient.submission.count.mockResolvedValue(1);
      mockReadClient.submission.findMany.mockResolvedValue(mockSubmissions);

      // Act
      const result = await repository.getSubmissions(pagination);

      // Assert
      expect(result.total).toBe(1);
      expect(result.submissions).toEqual(mockSubmissions);
      expect(mockReadClient.submission.count).toHaveBeenCalledWith({
        where: { status: undefined },
      });
    });
  });

  describe('getSubmission', () => {
    it('should get submission by ID', async () => {
      // Arrange
      const submissionId = 'test-submission-id';
      const mockSubmission = { id: submissionId, studentId: 'student-1' };
      mockReadClient.submission.findUnique.mockResolvedValue(mockSubmission);

      // Act
      const result = await repository.getSubmission(submissionId);

      // Assert
      expect(result).toEqual(mockSubmission);
      expect(mockReadClient.submission.findUnique).toHaveBeenCalledWith({
        where: { id: submissionId },
      });
    });
  });

  describe('getFailedAndNotRetriedSubmissions', () => {
    it('should get failed submissions that have not been retried', async () => {
      // Arrange
      const mockFailedSubmissions = [
        { id: 'failed-1', status: SubmissionStatus.FAILED, retried: false },
        { id: 'failed-2', status: SubmissionStatus.FAILED, retried: false },
      ];
      mockReadClient.submission.findMany.mockResolvedValue(
        mockFailedSubmissions,
      );

      // Act
      const result = await repository.getFailedAndNotRetriedSubmissions();

      // Assert
      expect(result).toEqual(mockFailedSubmissions);
      expect(mockReadClient.submission.findMany).toHaveBeenCalledWith({
        where: {
          status: SubmissionStatus.FAILED,
          retried: false,
        },
      });
    });
  });

  describe('completeSubmission', () => {
    it('should complete submission and update log', async () => {
      // Arrange
      const submissionId = 'test-submission-id';
      const score = 8;
      const feedback = 'Good essay';
      const highlights = ['grammar', 'structure'];
      const logInfo = { submissionId: submissionId, score, feedback };

      mockWriteClient.tx.submission.update.mockResolvedValue(undefined);
      mockWriteClient.tx.submissionLog.update.mockResolvedValue(undefined);

      // Act
      await repository.completeSubmission(
        submissionId,
        score,
        feedback,
        highlights,
        { ...mockLogContext, logInfo },
      );

      // Assert
      expect(mockWriteClient.tx.submission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: {
          score,
          status: SubmissionStatus.COMPLETED,
          feedback,
          highlights,
        },
      });
      expect(mockWriteClient.tx.submissionLog.update).toHaveBeenCalledWith({
        where: { traceId: mockLogContext.traceId },
        data: {
          status: SubmissionLogStatus.COMPLETED,
          ...logInfo,
          latency: expect.any(Number),
        },
      });
    });
  });

  describe('checkAlreadySubmitted', () => {
    it('should check if student already submitted for component type', async () => {
      // Arrange
      const studentId = 'student-1';
      const componentType = 'Essay Writing';
      const mockExistingSubmission = { id: 'existing-sub' };
      mockReadClient.submission.findFirst.mockResolvedValue(
        mockExistingSubmission,
      );

      // Act
      const result = await repository.checkAlreadySubmitted(
        studentId,
        componentType,
      );

      // Assert
      expect(result).toEqual(mockExistingSubmission);
      expect(mockReadClient.submission.findFirst).toHaveBeenCalledWith({
        select: { id: true },
        where: { studentId, componentType },
      });
    });

    it('should return null when no existing submission found', async () => {
      // Arrange
      const studentId = 'student-1';
      const componentType = 'Essay Writing';
      mockReadClient.submission.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.checkAlreadySubmitted(
        studentId,
        componentType,
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('failSubmission', () => {
    it('should fail submission and update log', async () => {
      // Arrange
      const submissionId = 'test-submission-id';
      const traceId = 'test-trace-id';
      const startTime = Date.now();
      const externalError = 'Processing failed';

      mockWriteClient.tx.submission.update.mockResolvedValue(undefined);
      mockWriteClient.tx.submissionLog.update.mockResolvedValue(undefined);

      // Act
      await repository.failSubmission(
        submissionId,
        traceId,
        startTime,
        externalError,
      );

      // Assert
      expect(mockWriteClient.tx.submission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { status: SubmissionStatus.FAILED },
      });
      expect(mockWriteClient.tx.submissionLog.update).toHaveBeenCalledWith({
        where: { traceId },
        data: {
          status: SubmissionLogStatus.FAILED,
          errorMessage: externalError,
          latency: expect.any(Number),
        },
      });
    });
  });

  describe('createSubmissionMedia', () => {
    it('should create submission media', async () => {
      // Arrange
      const submissionId = 'test-submission-id';
      const mediaType = MediaType.VIDEO;
      const fileUrl = 'https://example.com/video.mp4';
      const sasUrl = 'https://example.com/video.mp4?sas=token';
      const fileSize = 1024;

      const mockCreatedMedia = {
        id: 'test-uuid-123',
        submissionId,
        mediaType,
        fileUrl,
        sasUrl,
        fileSize,
      };
      mockWriteClient.tx.submissionMedia.create.mockResolvedValue(
        mockCreatedMedia,
      );

      // Act
      const result = await repository.createSubmissionMedia(
        submissionId,
        mediaType,
        fileUrl,
        sasUrl,
        fileSize,
      );

      // Assert
      expect(result).toEqual(mockCreatedMedia);
      expect(mockWriteClient.tx.submissionMedia.create).toHaveBeenCalledWith({
        data: {
          id: 'test-uuid-123',
          submissionId,
          mediaType,
          fileUrl,
          sasUrl,
          fileSize,
        },
      });
    });
  });

  describe('getSubmissionMedia', () => {
    it('should get submission media by type', async () => {
      // Arrange
      const submissionId = 'test-submission-id';
      const mediaType = MediaType.VIDEO;
      const mockMedia = {
        id: 'media-1',
        submissionId,
        mediaType,
        fileUrl: 'https://example.com/video.mp4',
      };
      mockReadClient.submissionMedia.findFirst.mockResolvedValue(mockMedia);

      // Act
      const result = await repository.getSubmissionMedia(
        submissionId,
        mediaType,
      );

      // Assert
      expect(result).toEqual(mockMedia);
      expect(mockReadClient.submissionMedia.findFirst).toHaveBeenCalledWith({
        where: { submissionId, mediaType },
      });
    });
  });

  describe('updateSubmissionRetried', () => {
    it('should update submission as retried', async () => {
      // Arrange
      const submissionId = 'test-submission-id';
      mockWriteClient.tx.submission.update.mockResolvedValue(undefined);

      // Act
      await repository.updateSubmissionRetried(submissionId);

      // Assert
      expect(mockWriteClient.tx.submission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { retried: true },
      });
    });
  });
});
