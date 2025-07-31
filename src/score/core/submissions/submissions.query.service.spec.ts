import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsQueryService } from './submissions.query.service';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { SubmissionStatus } from '@prisma/client';
import { createMock } from '@golevelup/ts-jest';

describe('SubmissionsQueryService', () => {
  let service: SubmissionsQueryService;
  let submissionRepository: jest.Mocked<SubmissionRepository>;

  const mockPagination: Pagination = {
    skip: 0,
    take: 10,
    orderBy: { studentId: 'asc' },
  };

  const mockSubmission = {
    id: 'submission-123',
    studentId: 'student-123',
    studentName: 'John Doe',
    componentType: 'Essay Writing',
    submitText: 'This is a test essay.',
    retried: false,
    status: SubmissionStatus.COMPLETED,
    score: 85,
    feedback: 'Good essay with room for improvement.',
    highlights: ['good', 'improvement'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmissionsResponse = {
    total: 1,
    submissions: [mockSubmission],
  };

  beforeEach(async () => {
    const mockSubmissionRepository = createMock<SubmissionRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsQueryService,
        {
          provide: SubmissionRepository,
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile();

    service = module.get<SubmissionsQueryService>(SubmissionsQueryService);
    submissionRepository = module.get(SubmissionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getSubmissions', () => {
    it('should get submissions with status filter', async () => {
      // Arrange
      submissionRepository.getSubmissions.mockResolvedValue(
        mockSubmissionsResponse,
      );

      // Act
      const result = await service.getSubmissions(
        mockPagination,
        SubmissionStatus.COMPLETED,
      );

      // Assert
      expect(result).toEqual(mockSubmissionsResponse);
      expect(submissionRepository.getSubmissions).toHaveBeenCalledWith(
        mockPagination,
        SubmissionStatus.COMPLETED,
      );
    });

    it('should get submissions without status filter', async () => {
      // Arrange
      submissionRepository.getSubmissions.mockResolvedValue(
        mockSubmissionsResponse,
      );

      // Act
      const result = await service.getSubmissions(mockPagination);

      // Assert
      expect(result).toEqual(mockSubmissionsResponse);
      expect(submissionRepository.getSubmissions).toHaveBeenCalledWith(
        mockPagination,
        undefined,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const error = new Error('Database error');
      submissionRepository.getSubmissions.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getSubmissions(mockPagination, SubmissionStatus.COMPLETED),
      ).rejects.toThrow('Database error');

      expect(submissionRepository.getSubmissions).toHaveBeenCalledWith(
        mockPagination,
        SubmissionStatus.COMPLETED,
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      const emptyResponse = { total: 0, submissions: [] };
      submissionRepository.getSubmissions.mockResolvedValue(emptyResponse);

      // Act
      const result = await service.getSubmissions(
        mockPagination,
        SubmissionStatus.PENDING,
      );

      // Assert
      expect(result).toEqual(emptyResponse);
      expect(submissionRepository.getSubmissions).toHaveBeenCalledWith(
        mockPagination,
        SubmissionStatus.PENDING,
      );
    });
  });

  describe('#getSubmission', () => {
    it('should get submission by ID', async () => {
      // Arrange
      const submissionId = 'submission-123';
      submissionRepository.getSubmission.mockResolvedValue(mockSubmission);

      // Act
      const result = await service.getSubmission(submissionId);

      // Assert
      expect(result).toEqual(mockSubmission);
      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        submissionId,
      );
    });

    it('should return null when submission not found', async () => {
      // Arrange
      const submissionId = 'non-existent-id';
      submissionRepository.getSubmission.mockResolvedValue(null);

      // Act
      const result = await service.getSubmission(submissionId);

      // Assert
      expect(result).toBeNull();
      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        submissionId,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const submissionId = 'submission-123';
      const error = new Error('Database error');
      submissionRepository.getSubmission.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getSubmission(submissionId)).rejects.toThrow(
        'Database error',
      );

      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        submissionId,
      );
    });

    it('should handle invalid UUID format', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format');
      submissionRepository.getSubmission.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getSubmission(invalidId)).rejects.toThrow(
        'Invalid UUID format',
      );

      expect(submissionRepository.getSubmission).toHaveBeenCalledWith(
        invalidId,
      );
    });
  });
});
