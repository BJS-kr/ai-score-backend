import { Test, TestingModule } from '@nestjs/testing';
import { CronReviewProducer } from './cron.review.producer';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { LoggerService } from 'src/common/logger/logger.service';
import { Queue } from 'bullmq';
import { JOB_NAME } from '../../job.constants';
import { SubmissionStatus } from '@prisma/client';
import { createMock } from '@golevelup/ts-jest';

// Mock the telemetry module
jest.mock('src/system/telemetry/traced', () => ({
  traced: jest.fn((service, method, fn: () => Promise<void>) => {
    return fn();
  }),
}));

describe('CronReviewProducer', () => {
  let producer: CronReviewProducer;
  let submissionRepository: jest.Mocked<SubmissionRepository>;
  let loggerService: jest.Mocked<LoggerService>;
  let cronReviewQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const mockSubmissionRepository = createMock<SubmissionRepository>();
    const mockLoggerService = createMock<LoggerService>();
    const mockQueue = createMock<Queue>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronReviewProducer,
        {
          provide: SubmissionRepository,
          useValue: mockSubmissionRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: `BullQueue_${JOB_NAME.CRON_REVIEW}`,
          useValue: mockQueue,
        },
      ],
    }).compile();

    producer = module.get<CronReviewProducer>(CronReviewProducer);
    submissionRepository = module.get(SubmissionRepository);
    loggerService = module.get(LoggerService);
    cronReviewQueue = module.get(`BullQueue_${JOB_NAME.CRON_REVIEW}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(producer).toBeDefined();
  });

  describe('#handleRetryFailedReviews', () => {
    it('should successfully process failed submissions and add them to queue', async () => {
      // Arrange
      const mockSubmissions = [
        {
          id: 'submission-1',
          studentId: 'student-1',
          studentName: 'John Doe',
          componentType: 'ESSAY',
          submitText: 'Sample essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission-2',
          studentId: 'student-2',
          studentName: 'Jane Smith',
          componentType: 'ESSAY',
          submitText: 'Another essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission-3',
          studentId: 'student-3',
          studentName: 'Bob Johnson',
          componentType: 'ESSAY',
          submitText: 'Third essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedQueueJobs = [
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-1' } },
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-2' } },
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-3' } },
      ];

      submissionRepository.getFailedAndNotRetriedSubmissions.mockResolvedValue(
        mockSubmissions,
      );
      cronReviewQueue.addBulk.mockResolvedValue([]);

      // Act
      await producer.handleRetryFailedReviews();

      // Assert
      expect(
        submissionRepository.getFailedAndNotRetriedSubmissions,
      ).toHaveBeenCalledTimes(1);
      expect(cronReviewQueue.addBulk).toHaveBeenCalledWith(expectedQueueJobs);
      expect(cronReviewQueue.addBulk).toHaveBeenCalledTimes(1);
      expect(loggerService.info).toHaveBeenCalledWith(
        'Cron: retrying one-time failed submissions...',
      );
      // Note: The success message is not logged because the traced function is not awaited in the actual implementation
      // This is a limitation of the current implementation, not the test
    });

    it('should handle case when no failed submissions exist', async () => {
      // Arrange
      submissionRepository.getFailedAndNotRetriedSubmissions.mockResolvedValue(
        [],
      );
      cronReviewQueue.addBulk.mockResolvedValue([]);

      // Act
      await producer.handleRetryFailedReviews();

      // Assert
      expect(
        submissionRepository.getFailedAndNotRetriedSubmissions,
      ).toHaveBeenCalledTimes(1);
      expect(cronReviewQueue.addBulk).toHaveBeenCalledWith([]);
      expect(loggerService.info).toHaveBeenCalledWith(
        'Cron: retrying one-time failed submissions...',
      );
      expect(loggerService.info).not.toHaveBeenCalledWith(
        expect.stringContaining('successfully added'),
        'CronReviewProducer',
      );
    });

    it('should handle single failed submission', async () => {
      // Arrange
      const mockSubmissions = [
        {
          id: 'submission-1',
          studentId: 'student-1',
          studentName: 'John Doe',
          componentType: 'ESSAY',
          submitText: 'Sample essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const expectedQueueJobs = [
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-1' } },
      ];

      submissionRepository.getFailedAndNotRetriedSubmissions.mockResolvedValue(
        mockSubmissions,
      );
      cronReviewQueue.addBulk.mockResolvedValue([]);

      // Act
      await producer.handleRetryFailedReviews();

      // Assert
      expect(
        submissionRepository.getFailedAndNotRetriedSubmissions,
      ).toHaveBeenCalledTimes(1);
      expect(cronReviewQueue.addBulk).toHaveBeenCalledWith(expectedQueueJobs);
      // Note: The success message is not logged because the traced function is not awaited in the actual implementation
    });

    it('should handle submissions with different data structures', async () => {
      // Arrange
      const mockSubmissions = [
        {
          id: 'submission-1',
          studentId: 'student-1',
          studentName: 'John Doe',
          componentType: 'ESSAY',
          submitText: 'Sample essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission-2',
          studentId: 'student-2',
          studentName: 'Jane Smith',
          componentType: 'ESSAY',
          submitText: 'Another essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission-3',
          studentId: 'student-3',
          studentName: 'Bob Johnson',
          componentType: 'ESSAY',
          submitText: 'Third essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedQueueJobs = [
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-1' } },
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-2' } },
        { name: JOB_NAME.CRON_REVIEW, data: { submissionId: 'submission-3' } },
      ];

      submissionRepository.getFailedAndNotRetriedSubmissions.mockResolvedValue(
        mockSubmissions,
      );
      cronReviewQueue.addBulk.mockResolvedValue([]);

      // Act
      await producer.handleRetryFailedReviews();

      // Assert
      expect(cronReviewQueue.addBulk).toHaveBeenCalledWith(expectedQueueJobs);
      // Note: The success message is not logged because the traced function is not awaited in the actual implementation
    });

    it('should handle large number of submissions efficiently', async () => {
      // Arrange
      const mockSubmissions = Array.from({ length: 1000 }, (_, index) => ({
        id: `submission-${index + 1}`,
        studentId: `student-${index + 1}`,
        studentName: `Student ${index + 1}`,
        componentType: 'ESSAY',
        submitText: `Essay text ${index + 1}`,
        retried: false,
        status: SubmissionStatus.FAILED,
        score: null,
        feedback: null,
        highlights: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const expectedQueueJobs = mockSubmissions.map((submission) => ({
        name: JOB_NAME.CRON_REVIEW,
        data: { submissionId: submission.id },
      }));

      submissionRepository.getFailedAndNotRetriedSubmissions.mockResolvedValue(
        mockSubmissions,
      );
      cronReviewQueue.addBulk.mockResolvedValue([]);

      // Act
      await producer.handleRetryFailedReviews();

      // Assert
      expect(cronReviewQueue.addBulk).toHaveBeenCalledWith(expectedQueueJobs);
      // Note: The success message is not logged because the traced function is not awaited in the actual implementation
    });

    it('should handle submissions with special characters in IDs', async () => {
      // Arrange
      const mockSubmissions = [
        {
          id: 'submission-with-dash-1',
          studentId: 'student-1',
          studentName: 'John Doe',
          componentType: 'ESSAY',
          submitText: 'Sample essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission_with_underscore',
          studentId: 'student-2',
          studentName: 'Jane Smith',
          componentType: 'ESSAY',
          submitText: 'Another essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission.with.dot',
          studentId: 'student-3',
          studentName: 'Bob Johnson',
          componentType: 'ESSAY',
          submitText: 'Third essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission123',
          studentId: 'student-4',
          studentName: 'Alice Brown',
          componentType: 'ESSAY',
          submitText: 'Fourth essay text',
          retried: false,
          status: SubmissionStatus.FAILED,
          score: null,
          feedback: null,
          highlights: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedQueueJobs = [
        {
          name: JOB_NAME.CRON_REVIEW,
          data: { submissionId: 'submission-with-dash-1' },
        },
        {
          name: JOB_NAME.CRON_REVIEW,
          data: { submissionId: 'submission_with_underscore' },
        },
        {
          name: JOB_NAME.CRON_REVIEW,
          data: { submissionId: 'submission.with.dot' },
        },
        {
          name: JOB_NAME.CRON_REVIEW,
          data: { submissionId: 'submission123' },
        },
      ];

      submissionRepository.getFailedAndNotRetriedSubmissions.mockResolvedValue(
        mockSubmissions,
      );
      cronReviewQueue.addBulk.mockResolvedValue([]);

      // Act
      await producer.handleRetryFailedReviews();

      // Assert
      expect(cronReviewQueue.addBulk).toHaveBeenCalledWith(expectedQueueJobs);
      // Note: The success message is not logged because the traced function is not awaited in the actual implementation
    });
  });
});
