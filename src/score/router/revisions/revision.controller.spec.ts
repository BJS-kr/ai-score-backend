import { Test, TestingModule } from '@nestjs/testing';
import { RevisionController } from './revision.controller';
import { RevisionQueryService } from 'src/score/core/revisions/revision.query.service';
import { createMock } from '@golevelup/ts-jest';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/common/logger/logger.service';
import { RevisionService } from 'src/score/core/revisions/revision.service';

jest.mock(
  'src/score/router/common/dto/response/review.response.dto.ts',
  () => ({
    ReviewResponseDto: {
      build: jest.fn(),
    },
  }),
);

describe('RevisionController', () => {
  let controller: RevisionController;
  let revisionService: jest.Mocked<RevisionService>;
  let revisionQueryService: jest.Mocked<RevisionQueryService>;

  beforeEach(async () => {
    const mockRevisionService = createMock<RevisionService>();
    const mockRevisionQueryService = createMock<RevisionQueryService>();
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RevisionController],
      providers: [
        {
          provide: RevisionService,
          useValue: mockRevisionService,
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
    revisionService = module.get(RevisionService);
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

    revisionService.reviseSubmission.mockResolvedValue({
      success: true,
      data: {
        message: 'Success',
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        score: 5,
        feedback: 'Good work!',
        highlights: ['highlight1', 'highlight2'],
        highlightedText: 'This is highlighted text',
        studentId: 'student-123',
        studentName: 'John Doe',
        submitText: 'Sample submission text',
      },
    });

    await controller.createRevision({ submissionId }, logContext);

    expect(revisionService.reviseSubmission).toHaveBeenCalledWith(logContext);
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

    await controller.getRevisions(pagination);

    expect(revisionQueryService.getRevisions).toHaveBeenCalledWith(pagination);
  });

  it('should get revision by ID', async () => {
    const revisionId = 'revision-123';

    revisionQueryService.getRevision.mockResolvedValue({
      id: revisionId,
      submissionId: 'submission-123',
      status: 'COMPLETED',
      createdAt: new Date(),
    });

    await controller.getRevision(revisionId);

    expect(revisionQueryService.getRevision).toHaveBeenCalledWith(revisionId);
  });
});
