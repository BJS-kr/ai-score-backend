import { Test, TestingModule } from '@nestjs/testing';
import { CronReviewConsumer } from './cron.review.consumer';
import { RevisionReviewService } from 'src/score/core/revisions/revision.review.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { Job } from 'bullmq';
import { createMock } from '@golevelup/ts-jest';

jest.mock('src/system/telemetry/traced', () => ({
  traced: jest.fn((service, method, fn) => {
    return fn();
  }),
}));

describe('CronReviewConsumer', () => {
  let consumer: CronReviewConsumer;
  let revisionReviewService: jest.Mocked<RevisionReviewService>;

  beforeEach(async () => {
    const mockRevisionReviewService = createMock<RevisionReviewService>();
    const mockLoggerService = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronReviewConsumer,
        {
          provide: RevisionReviewService,
          useValue: mockRevisionReviewService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    consumer = module.get<CronReviewConsumer>(CronReviewConsumer);
    revisionReviewService = module.get(RevisionReviewService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('should process job successfully', async () => {
    const mockJob = {
      data: { submissionId: 'test-submission-123' },
      name: 'cron-review-job',
    } as Job<{ submissionId: string }, void>;

    revisionReviewService.reviseSubmission.mockResolvedValue({
      success: true,
      data: {
        message: 'Success',
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        score: 85,
        feedback: 'Good work!',
        highlights: ['highlight1', 'highlight2'],
        highlightedText: 'This is highlighted text',
        studentId: 'student-123',
        studentName: 'John Doe',
        submitText: 'Sample submission text',
      },
    });

    await consumer.process(mockJob);

    expect(revisionReviewService.reviseSubmission).toHaveBeenCalled();
  });
});
