import { Test, TestingModule } from '@nestjs/testing';
import { RevisionController } from './revision.controller';
import { RevisionReviewService } from 'src/score/core/revisions/revision.review.service';
import { RevisionQueryService } from 'src/score/core/revisions/revision.query.service';
import { createMock } from '@golevelup/ts-jest';
import { LogContext } from 'src/common/decorators/param/log.context';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/common/logger/logger.service';

describe('RevisionController', () => {
  let controller: RevisionController;
  let revisionReviewService: jest.Mocked<RevisionReviewService>;
  let revisionQueryService: jest.Mocked<RevisionQueryService>;

  beforeEach(async () => {
    const mockRevisionReviewService = createMock<RevisionReviewService>();
    const mockRevisionQueryService = createMock<RevisionQueryService>();
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RevisionController],
      providers: [
        {
          provide: RevisionReviewService,
          useValue: mockRevisionReviewService,
        },
        {
          provide: RevisionQueryService,
          useValue: mockRevisionQueryService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    controller = module.get<RevisionController>(RevisionController);
    revisionReviewService = module.get(RevisionReviewService);
    revisionQueryService = module.get(RevisionQueryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create revision', async () => {
    const submissionId = 'test-submission-123';
    const logContext: LogContext = {
      traceId: 'test-trace-id',
      requestUri: '/revision',
      startTime: Date.now(),
      logInfo: { submissionId: '' },
    };

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

    const result = await controller.createRevision(
      { submissionId },
      logContext,
    );

    expect(revisionReviewService.reviseSubmission).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should get revisions', async () => {
    const pagination = {
      skip: 0,
      take: 10,
      orderBy: { submissionId: 'asc' as const },
    };

    revisionQueryService.getRevisions.mockResolvedValue({
      total: 1,
      revisions: [],
    });

    const result = await controller.getRevisions(pagination);

    expect(revisionQueryService.getRevisions).toHaveBeenCalledWith(pagination);
    expect(result).toBeDefined();
  });

  it('should get revision by ID', async () => {
    const revisionId = 'revision-123';

    revisionQueryService.getRevision.mockResolvedValue({
      id: revisionId,
      submissionId: 'submission-123',
      status: 'COMPLETED',
      createdAt: new Date(),
    });

    const result = await controller.getRevision(revisionId);

    expect(revisionQueryService.getRevision).toHaveBeenCalledWith(revisionId);
    expect(result).toBeDefined();
  });
});
