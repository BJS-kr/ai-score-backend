import { Test, TestingModule } from '@nestjs/testing';
import { RevisionQueryService } from './revision.query.service';
import { RevisionRepository } from 'src/score/IO/respositories/revision.repository';
import { Pagination } from 'src/common/decorators/param/pagination';
import { RevisionStatus } from '@prisma/client';

describe('RevisionQueryService', () => {
  let service: RevisionQueryService;
  let revisionRepository: jest.Mocked<RevisionRepository>;

  const mockPagination: Pagination = {
    skip: 0,
    take: 10,
    orderBy: { createdAt: 'desc' },
  };

  const mockRevision = {
    id: 'revision-123',
    submissionId: 'submission-123',
    status: RevisionStatus.COMPLETED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRevisionsResponse = {
    total: 1,
    revisions: [mockRevision],
  };

  beforeEach(async () => {
    const mockRevisionRepository = {
      getRevisions: jest.fn(),
      getRevision: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisionQueryService,
        {
          provide: RevisionRepository,
          useValue: mockRevisionRepository,
        },
      ],
    }).compile();

    service = module.get<RevisionQueryService>(RevisionQueryService);
    revisionRepository = module.get(RevisionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getRevisions', () => {
    it('should get revisions with pagination', async () => {
      // Arrange
      revisionRepository.getRevisions.mockResolvedValue(mockRevisionsResponse);

      // Act
      const result = await service.getRevisions(mockPagination);

      // Assert
      expect(result).toEqual(mockRevisionsResponse);
      expect(revisionRepository.getRevisions).toHaveBeenCalledWith(
        mockPagination,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const error = new Error('Database error');
      revisionRepository.getRevisions.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getRevisions(mockPagination)).rejects.toThrow(
        'Database error',
      );

      expect(revisionRepository.getRevisions).toHaveBeenCalledWith(
        mockPagination,
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      const emptyResponse = { total: 0, revisions: [] };
      revisionRepository.getRevisions.mockResolvedValue(emptyResponse);

      // Act
      const result = await service.getRevisions(mockPagination);

      // Assert
      expect(result).toEqual(emptyResponse);
      expect(revisionRepository.getRevisions).toHaveBeenCalledWith(
        mockPagination,
      );
    });

    it('should handle multiple revisions', async () => {
      // Arrange
      const multipleRevisions = {
        total: 3,
        revisions: [
          mockRevision,
          { ...mockRevision, id: 'revision-456' },
          { ...mockRevision, id: 'revision-789' },
        ],
      };
      revisionRepository.getRevisions.mockResolvedValue(multipleRevisions);

      // Act
      const result = await service.getRevisions(mockPagination);

      // Assert
      expect(result).toEqual(multipleRevisions);
      expect(result.total).toBe(3);
      expect(result.revisions).toHaveLength(3);
      expect(revisionRepository.getRevisions).toHaveBeenCalledWith(
        mockPagination,
      );
    });
  });

  describe('#getRevision', () => {
    it('should get revision by ID', async () => {
      // Arrange
      const revisionId = 'revision-123';
      revisionRepository.getRevision.mockResolvedValue(mockRevision);

      // Act
      const result = await service.getRevision(revisionId);

      // Assert
      expect(result).toEqual(mockRevision);
      expect(revisionRepository.getRevision).toHaveBeenCalledWith(revisionId);
    });

    it('should return null when revision not found', async () => {
      // Arrange
      const revisionId = 'non-existent-id';
      revisionRepository.getRevision.mockResolvedValue(null);

      // Act
      const result = await service.getRevision(revisionId);

      // Assert
      expect(result).toBeNull();
      expect(revisionRepository.getRevision).toHaveBeenCalledWith(revisionId);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const revisionId = 'revision-123';
      const error = new Error('Database error');
      revisionRepository.getRevision.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getRevision(revisionId)).rejects.toThrow(
        'Database error',
      );

      expect(revisionRepository.getRevision).toHaveBeenCalledWith(revisionId);
    });

    it('should handle invalid UUID format', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format');
      revisionRepository.getRevision.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getRevision(invalidId)).rejects.toThrow(
        'Invalid UUID format',
      );

      expect(revisionRepository.getRevision).toHaveBeenCalledWith(invalidId);
    });

    it('should handle different revision statuses', async () => {
      // Arrange
      const pendingRevision = {
        ...mockRevision,
        status: RevisionStatus.PENDING,
      };
      const revisionId = 'revision-123';
      revisionRepository.getRevision.mockResolvedValue(pendingRevision);

      // Act
      const result = await service.getRevision(revisionId);

      // Assert
      expect(result).toEqual(pendingRevision);
      expect(result?.status).toBe(RevisionStatus.PENDING);
      expect(revisionRepository.getRevision).toHaveBeenCalledWith(revisionId);
    });
  });
});
