import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionController } from './submissions.controller';
import { SubmissionsReviewService } from '../../core/submissions/submissions.review.service';
import { SubmissionsQueryService } from '../../core/submissions/submissions.query.service';
import { SubmissionRequestDto } from './dto/request/submission.request.dto';
import { Pagination } from 'src/common/decorators/param/pagination';
import { LogContext } from 'src/common/decorators/param/log.context';
import { SubmissionStatus } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { createMock } from '@golevelup/ts-jest';

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let reviewService: jest.Mocked<SubmissionsReviewService>;
  let queryService: jest.Mocked<SubmissionsQueryService>;

  const mockFile: Express.Multer.File = {
    fieldname: 'video',
    originalname: 'test.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    size: 1024,
    destination: '/tmp',
    filename: 'test.mp4',
    path: '/tmp/test.mp4',
    buffer: Buffer.from('test'),
    stream: {} as any,
  };

  const mockSubmissionRequestDto: SubmissionRequestDto = {
    studentId: '123e4567-e89b-12d3-a456-426614174000',
    studentName: 'John Doe',
    componentType: 'Essay Writing',
    submitText: 'This is a test essay.',
  };

  const mockLogContext: LogContext = {
    traceId: 'test-trace-id',
    requestUri: '/submissions',
    startTime: Date.now(),
    logInfo: {
      submissionId: 'submission-123',
    },
  };

  beforeEach(async () => {
    const mockReviewService = createMock<SubmissionsReviewService>();
    const mockQueryService = createMock<SubmissionsQueryService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionController],
      providers: [
        {
          provide: SubmissionsReviewService,
          useValue: mockReviewService,
        },
        {
          provide: SubmissionsQueryService,
          useValue: mockQueryService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubmissionController>(SubmissionController);
    reviewService = module.get(SubmissionsReviewService);
    queryService = module.get(SubmissionsQueryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should submit for review', async () => {
    reviewService.newSubmission.mockResolvedValue({
      success: true,
      data: {
        message: 'Success',
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        studentName: 'John Doe',
        submitText: 'This is a test essay.',
        score: 85,
        feedback: 'Good essay',
        highlights: ['good'],
        highlightedText: '<b>good</b> essay',
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
      },
    });

    const result = await controller.submitForReview(
      mockFile,
      mockSubmissionRequestDto,
      mockLogContext,
    );

    expect(reviewService.newSubmission).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should get submissions', async () => {
    const pagination: Pagination = {
      skip: 0,
      take: 10,
      orderBy: { studentId: 'asc' },
    };

    queryService.getSubmissions.mockResolvedValue({
      submissions: [],
      total: 0,
    });

    const result = await controller.getSubmissions(pagination, {
      status: SubmissionStatus.COMPLETED,
    });

    expect(queryService.getSubmissions).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should get submission by ID', async () => {
    const submissionId = 'submission-123';

    queryService.getSubmission.mockResolvedValue({
      id: submissionId,
      studentId: '123e4567-e89b-12d3-a456-426614174000',
      studentName: 'John Doe',
      componentType: 'Essay Writing',
      submitText: 'This is a test essay.',
      retried: false,
      status: SubmissionStatus.COMPLETED,
      score: 85,
      feedback: 'Good essay',
      highlights: ['good'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await controller.getSubmission(submissionId);

    expect(queryService.getSubmission).toHaveBeenCalledWith(submissionId);
    expect(result).toBeDefined();
  });
});
