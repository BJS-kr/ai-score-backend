import { Test, TestingModule } from '@nestjs/testing';
import { CronReviewConsumer } from './cron.review.consumer';
import { LoggerService } from 'src/common/logger/logger.service';
import { Job } from 'bullmq';
import { createMock } from '@golevelup/ts-jest';
import { RevisionService } from 'src/score/core/revisions/revision.service';

jest.mock('src/system/telemetry/traced', () => ({
  traced: jest.fn((service, method, fn: () => Promise<void>) => {
    return fn();
  }),
}));

describe('CronReviewConsumer', () => {
  let consumer: CronReviewConsumer;
  let revisionService: jest.Mocked<RevisionService>;

  beforeEach(async () => {
    const mockRevisionService = createMock<RevisionService>();
    const mockLoggerService = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronReviewConsumer,
        {
          provide: RevisionService,
          useValue: mockRevisionService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    consumer = module.get<CronReviewConsumer>(CronReviewConsumer);
    revisionService = module.get(RevisionService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('should process job successfully', async () => {
    const mockJob = {
      data: { submissionId: 'test-submission-123' },
      name: 'cron-review-job',
    } as Job<{ submissionId: string }, void>;

    revisionService.reviseSubmission.mockResolvedValue({
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

    expect(revisionService.reviseSubmission).toHaveBeenCalled();
  });
});
