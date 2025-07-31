import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionController } from './submissions.controller';
import { SubmissionsQueryService } from '../../core/submissions/submissions.query.service';
import { SubmissionRequestDto } from './dto/request/submission.request.dto';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { SubmissionStatus } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { createMock } from '@golevelup/ts-jest';
import { SubmissionsService } from 'src/score/core/submissions/submissions.service';
import { Readable } from 'stream';

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let submissionsService: jest.Mocked<SubmissionsService>;
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
    stream: {} as unknown as Readable,
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
    const mockSubmissionsService = createMock<SubmissionsService>();
    const mockQueryService = createMock<SubmissionsQueryService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: mockSubmissionsService,
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
    submissionsService = module.get(SubmissionsService);
    queryService = module.get(SubmissionsQueryService);
  });

  it('should submit for review', async () => {
    submissionsService.newSubmission.mockResolvedValue({
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

    await controller.submitForReview(
      mockFile,
      mockSubmissionRequestDto,
      mockLogContext,
    );

    expect(submissionsService.newSubmission).toHaveBeenCalledWith(
      mockFile,
      mockSubmissionRequestDto,
      mockLogContext,
    );
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

    await controller.getSubmissions(pagination, {
      status: SubmissionStatus.COMPLETED,
    });

    expect(queryService.getSubmissions).toHaveBeenCalledWith(
      pagination,
      SubmissionStatus.COMPLETED,
    );
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

    await controller.getSubmission(submissionId);

    expect(queryService.getSubmission).toHaveBeenCalledWith(submissionId);
  });
});
