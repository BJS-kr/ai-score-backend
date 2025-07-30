import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsRepository } from './statistics.repository';
import { PrismaService } from 'src/system/database/prisma.service';
import { SubmissionStatus } from '@prisma/client';
import { Stats } from 'src/score/cron/statistics.service';

describe('StatisticsRepository', () => {
  let repository: StatisticsRepository;
  let readClient: any;

  const mockStats: Stats = {
    total: 100,
    fails: 10,
    completes: 85,
  };

  const mockDailyStats = {
    id: 'daily-123',
    totalSubmissions: 100,
    successfulSubmissions: 85,
    failedSubmissions: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWeeklyStats = {
    id: 'weekly-123',
    totalSubmissions: 100,
    successfulSubmissions: 85,
    failedSubmissions: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMonthlyStats = {
    id: 'monthly-123',
    totalSubmissions: 100,
    successfulSubmissions: 85,
    failedSubmissions: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockReadClient = {
      statsDaily: {
        create: jest.fn(),
      },
      statsWeekly: {
        create: jest.fn(),
      },
      statsMonthly: {
        create: jest.fn(),
      },
      submission: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsRepository,
        {
          provide: PrismaService,
          useValue: mockReadClient,
        },
      ],
    }).compile();

    repository = module.get<StatisticsRepository>(StatisticsRepository);
    readClient = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('#createDailyStats', () => {
    it('should create daily statistics', async () => {
      // Arrange
      readClient.statsDaily.create.mockResolvedValue(mockDailyStats);

      // Act
      const result = await repository.createDailyStats(mockStats);

      // Assert
      expect(result).toEqual(mockDailyStats);
      expect(readClient.statsDaily.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 100,
          successfulSubmissions: 85,
          failedSubmissions: 10,
        },
      });
    });

    it('should handle zero values', async () => {
      // Arrange
      const zeroStats: Stats = { total: 0, fails: 0, completes: 0 };
      const zeroDailyStats = { ...mockDailyStats, ...zeroStats };
      readClient.statsDaily.create.mockResolvedValue(zeroDailyStats);

      // Act
      const result = await repository.createDailyStats(zeroStats);

      // Assert
      expect(result).toEqual(zeroDailyStats);
      expect(readClient.statsDaily.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 0,
          successfulSubmissions: 0,
          failedSubmissions: 0,
        },
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const error = new Error('Database error');
      readClient.statsDaily.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.createDailyStats(mockStats)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.statsDaily.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 100,
          successfulSubmissions: 85,
          failedSubmissions: 10,
        },
      });
    });
  });

  describe('#createWeeklyStats', () => {
    it('should create weekly statistics', async () => {
      // Arrange
      readClient.statsWeekly.create.mockResolvedValue(mockWeeklyStats);

      // Act
      const result = await repository.createWeeklyStats(mockStats);

      // Assert
      expect(result).toEqual(mockWeeklyStats);
      expect(readClient.statsWeekly.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 100,
          successfulSubmissions: 85,
          failedSubmissions: 10,
        },
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const error = new Error('Database error');
      readClient.statsWeekly.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.createWeeklyStats(mockStats)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.statsWeekly.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 100,
          successfulSubmissions: 85,
          failedSubmissions: 10,
        },
      });
    });
  });

  describe('#createMonthlyStats', () => {
    it('should create monthly statistics', async () => {
      // Arrange
      readClient.statsMonthly.create.mockResolvedValue(mockMonthlyStats);

      // Act
      const result = await repository.createMonthlyStats(mockStats);

      // Assert
      expect(result).toEqual(mockMonthlyStats);
      expect(readClient.statsMonthly.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 100,
          successfulSubmissions: 85,
          failedSubmissions: 10,
        },
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const error = new Error('Database error');
      readClient.statsMonthly.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.createMonthlyStats(mockStats)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.statsMonthly.create).toHaveBeenCalledWith({
        data: {
          totalSubmissions: 100,
          successfulSubmissions: 85,
          failedSubmissions: 10,
        },
      });
    });
  });

  describe('#getStatsByFromDate', () => {
    it('should get statistics from a given date', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const expectedStats: Stats = { total: 50, fails: 5, completes: 40 };

      readClient.submission.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(5) // fails
        .mockResolvedValueOnce(40); // completes

      // Act
      const result = await repository.getStatsByFromDate(fromDate);

      // Assert
      expect(result).toEqual(expectedStats);
      expect(readClient.submission.count).toHaveBeenCalledTimes(3);

      // Check total count call
      expect(readClient.submission.count).toHaveBeenNthCalledWith(1, {
        where: {
          createdAt: { gte: fromDate, lte: expect.any(Date) },
        },
      });

      // Check failed count call
      expect(readClient.submission.count).toHaveBeenNthCalledWith(2, {
        where: {
          createdAt: { gte: fromDate, lte: expect.any(Date) },
          status: SubmissionStatus.FAILED,
        },
      });

      // Check completed count call
      expect(readClient.submission.count).toHaveBeenNthCalledWith(3, {
        where: {
          createdAt: { gte: fromDate, lte: expect.any(Date) },
          status: SubmissionStatus.COMPLETED,
        },
      });
    });

    it('should handle zero statistics', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const expectedStats: Stats = { total: 0, fails: 0, completes: 0 };

      readClient.submission.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // fails
        .mockResolvedValueOnce(0); // completes

      // Act
      const result = await repository.getStatsByFromDate(fromDate);

      // Assert
      expect(result).toEqual(expectedStats);
      expect(readClient.submission.count).toHaveBeenCalledTimes(3);
    });

    it('should handle repository errors for total count', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const error = new Error('Database error');
      readClient.submission.count.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getStatsByFromDate(fromDate)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.submission.count).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors for failed count', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const error = new Error('Database error');

      readClient.submission.count
        .mockResolvedValueOnce(50) // total succeeds
        .mockRejectedValueOnce(error); // fails throws

      // Act & Assert
      await expect(repository.getStatsByFromDate(fromDate)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.submission.count).toHaveBeenCalledTimes(2);
    });

    it('should handle repository errors for completed count', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const error = new Error('Database error');

      readClient.submission.count
        .mockResolvedValueOnce(50) // total succeeds
        .mockResolvedValueOnce(5) // fails succeeds
        .mockRejectedValueOnce(error); // completes throws

      // Act & Assert
      await expect(repository.getStatsByFromDate(fromDate)).rejects.toThrow(
        'Database error',
      );

      expect(readClient.submission.count).toHaveBeenCalledTimes(3);
    });

    it('should handle current date correctly', async () => {
      // Arrange
      const fromDate = new Date();
      const expectedStats: Stats = { total: 10, fails: 1, completes: 8 };

      readClient.submission.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(1) // fails
        .mockResolvedValueOnce(8); // completes

      // Act
      const result = await repository.getStatsByFromDate(fromDate);

      // Assert
      expect(result).toEqual(expectedStats);
      expect(readClient.submission.count).toHaveBeenCalledTimes(3);

      // Verify the date range includes the current date
      const firstCall = readClient.submission.count.mock.calls[0][0];
      expect(firstCall.where.createdAt.gte).toBe(fromDate);
      expect(firstCall.where.createdAt.lte).toBeInstanceOf(Date);
    });
  });
});
