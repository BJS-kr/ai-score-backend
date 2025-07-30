import { Test, TestingModule } from '@nestjs/testing';
import { RevisionRepository } from './revision.repository';
import { PrismaService } from 'src/system/database/prisma.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { RevisionStatus } from '@prisma/client';
import { LogContext } from 'src/common/decorators/param/log.context';
import { Pagination } from 'src/common/decorators/param/pagination';
import { createMock } from '@golevelup/ts-jest';

describe('RevisionRepository', () => {
  let repository: RevisionRepository;
  let writeClient: any;
  let readClient: any;

  const mockLogContext: LogContext = {
    traceId: 'trace-123',
    requestUri: '/revision',
    startTime: Date.now(),
    logInfo: {
      submissionId: 'submission-123',
    },
  };

  const mockPagination: Pagination = {
    skip: 0,
    take: 10,
    orderBy: { createdAt: 'desc' },
  };

  const mockRevision = {
    id: 'revision-123',
    submissionId: 'submission-123',
    status: RevisionStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmissionLog = {
    id: 'log-123',
    traceId: 'trace-123',
    requestUri: 'revision',
    submissionId: 'submission-123',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockWriteClient = createMock<TransactionHost>();
    const mockReadClient = createMock<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisionRepository,
        {
          provide: TransactionHost,
          useValue: mockWriteClient,
        },
        {
          provide: PrismaService,
          useValue: mockReadClient,
        },
      ],
    }).compile();

    repository = module.get<RevisionRepository>(RevisionRepository);
    writeClient = module.get(TransactionHost);
    readClient = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('#createRevision', () => {
    it('should create revision with submission log', async () => {
      // Arrange
      writeClient.tx.submissionLog.create.mockResolvedValue(mockSubmissionLog);
      writeClient.tx.revision.create.mockResolvedValue(mockRevision);

      // Act
      const result = await repository.createRevision(mockLogContext);

      // Assert
      expect(result).toEqual(mockRevision);
      expect(writeClient.tx.submissionLog.create).toHaveBeenCalledWith({
        data: {
          traceId: 'trace-123',
          requestUri: 'revision',
          submissionId: 'submission-123',
        },
      });
      expect(writeClient.tx.revision.create).toHaveBeenCalledWith({
        data: { submissionId: 'submission-123' },
      });
    });

    it('should handle submission log creation error', async () => {
      // Arrange
      const error = new Error('Database error');
      writeClient.tx.submissionLog.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.createRevision(mockLogContext)).rejects.toThrow(
        'Database error',
      );

      expect(writeClient.tx.submissionLog.create).toHaveBeenCalledWith({
        data: {
          traceId: 'trace-123',
          requestUri: 'revision',
          submissionId: 'submission-123',
        },
      });
      expect(writeClient.tx.revision.create).not.toHaveBeenCalled();
    });

    it('should handle revision creation error', async () => {
      // Arrange
      const error = new Error('Database error');
      writeClient.tx.submissionLog.create.mockResolvedValue(mockSubmissionLog);
      writeClient.tx.revision.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.createRevision(mockLogContext)).rejects.toThrow(
        'Database error',
      );

      expect(writeClient.tx.submissionLog.create).toHaveBeenCalled();
      expect(writeClient.tx.revision.create).toHaveBeenCalledWith({
        data: { submissionId: 'submission-123' },
      });
    });
  });

  describe('#updateRevision', () => {
    it('should update revision status', async () => {
      // Arrange
      const revisionId = 'revision-123';
      const status = RevisionStatus.COMPLETED;
      const updatedRevision = { ...mockRevision, status };
      writeClient.tx.revision.update.mockResolvedValue(updatedRevision);

      // Act
      const result = await repository.updateRevision(revisionId, status);

      // Assert
      expect(result).toEqual(updatedRevision);
      expect(writeClient.tx.revision.update).toHaveBeenCalledWith({
        where: { id: revisionId },
        data: { status },
      });
    });

    it('should handle different revision statuses', async () => {
      // Arrange
      const revisionId = 'revision-123';
      const status = RevisionStatus.FAILED;
      const updatedRevision = { ...mockRevision, status };
      writeClient.tx.revision.update.mockResolvedValue(updatedRevision);

      // Act
      const result = await repository.updateRevision(revisionId, status);

      // Assert
      expect(result).toEqual(updatedRevision);
      expect(result.status).toBe(RevisionStatus.FAILED);
      expect(writeClient.tx.revision.update).toHaveBeenCalledWith({
        where: { id: revisionId },
        data: { status },
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const revisionId = 'revision-123';
      const status = RevisionStatus.COMPLETED;
      const error = new Error('Database error');
      writeClient.tx.revision.update.mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.updateRevision(revisionId, status),
      ).rejects.toThrow('Database error');

      expect(writeClient.tx.revision.update).toHaveBeenCalledWith({
        where: { id: revisionId },
        data: { status },
      });
    });
  });

  describe('#getRevisions', () => {
    it('should get revisions with pagination', async () => {
      // Arrange
      const total = 5;
      const revisions = [mockRevision, { ...mockRevision, id: 'revision-456' }];
      const expectedResult = { total, revisions };

      readClient.revision.count.mockResolvedValue(total);
      readClient.revision.findMany.mockResolvedValue(revisions);

      // Act
      const result = await repository.getRevisions(mockPagination);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(readClient.revision.count).toHaveBeenCalled();
      expect(readClient.revision.findMany).toHaveBeenCalledWith(mockPagination);
    });

    it('should handle empty results', async () => {
      // Arrange
      const total = 0;
      const revisions: any[] = [];
      const expectedResult = { total, revisions };

      readClient.revision.count.mockResolvedValue(total);
      readClient.revision.findMany.mockResolvedValue(revisions);

      // Act
      const result = await repository.getRevisions(mockPagination);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(result.total).toBe(0);
      expect(result.revisions).toHaveLength(0);
      expect(readClient.revision.count).toHaveBeenCalled();
      expect(readClient.revision.findMany).toHaveBeenCalledWith(mockPagination);
    });

    it('should handle count error', async () => {
      // Arrange
      const error = new Error('Database error');
      readClient.revision.count.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getRevisions(mockPagination)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.revision.count).toHaveBeenCalled();
      expect(readClient.revision.findMany).not.toHaveBeenCalled();
    });

    it('should handle findMany error', async () => {
      // Arrange
      const error = new Error('Database error');
      readClient.revision.count.mockResolvedValue(5);
      readClient.revision.findMany.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getRevisions(mockPagination)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.revision.count).toHaveBeenCalled();
      expect(readClient.revision.findMany).toHaveBeenCalledWith(mockPagination);
    });

    it('should handle different pagination parameters', async () => {
      // Arrange
      const customPagination: Pagination = {
        skip: 20,
        take: 5,
        orderBy: { updatedAt: 'asc' },
      };
      const total = 25;
      const revisions = [mockRevision];
      const expectedResult = { total, revisions };

      readClient.revision.count.mockResolvedValue(total);
      readClient.revision.findMany.mockResolvedValue(revisions);

      // Act
      const result = await repository.getRevisions(customPagination);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(readClient.revision.count).toHaveBeenCalled();
      expect(readClient.revision.findMany).toHaveBeenCalledWith(
        customPagination,
      );
    });
  });

  describe('#getRevision', () => {
    it('should get revision by ID', async () => {
      // Arrange
      const revisionId = 'revision-123';
      readClient.revision.findUnique.mockResolvedValue(mockRevision);

      // Act
      const result = await repository.getRevision(revisionId);

      // Assert
      expect(result).toEqual(mockRevision);
      expect(readClient.revision.findUnique).toHaveBeenCalledWith({
        where: { id: revisionId },
      });
    });

    it('should return null when revision not found', async () => {
      // Arrange
      const revisionId = 'non-existent-id';
      readClient.revision.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.getRevision(revisionId);

      // Assert
      expect(result).toBeNull();
      expect(readClient.revision.findUnique).toHaveBeenCalledWith({
        where: { id: revisionId },
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const revisionId = 'revision-123';
      const error = new Error('Database error');
      readClient.revision.findUnique.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getRevision(revisionId)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.revision.findUnique).toHaveBeenCalledWith({
        where: { id: revisionId },
      });
    });

    it('should handle invalid UUID format', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format');
      readClient.revision.findUnique.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getRevision(invalidId)).rejects.toThrow(
        'Invalid UUID format',
      );

      expect(readClient.revision.findUnique).toHaveBeenCalledWith({
        where: { id: invalidId },
      });
    });
  });
});
