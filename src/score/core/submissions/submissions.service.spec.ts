import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { SubmissionRepository } from '../../IO/respositories/submission.respository';
import { AzureBlobStorageIntegration } from '../../IO/integrations/azure-blob-storage.integration';
import { AzureOpenAIIntegration } from '../../IO/integrations/azure-openai.integration';
import { FfmpegIntegration } from '../../IO/integrations/ffmpeg.integration';
import { LoggerService } from 'src/common/logger/logger.service';
import { Processor } from 'src/score/helper/processor/processor';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { createMock } from '@golevelup/ts-jest';
import { ReviewParser } from '../reviews/review.parser';
import { ReviewService } from '../reviews/review.service';
import { MediaService } from '../media/media.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      return descriptor;
    },
}));

describe('SubmissionsReviewService', () => {
  let service: SubmissionsService;
  let submissionRepository: jest.Mocked<SubmissionRepository>;
  let azureBlobStorageIntegration: jest.Mocked<AzureBlobStorageIntegration>;
  let azureOpenAIIntegration: jest.Mocked<AzureOpenAIIntegration>;
  let ffmpegIntegration: jest.Mocked<FfmpegIntegration>;
  let reviewParser: jest.Mocked<ReviewParser>;

  const mockVideoFile: Express.Multer.File = {
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

  const mockSubmissionDto: SubmissionRequestDto = {
    studentId: '123e4567-e89b-12d3-a456-426614174000',
    studentName: 'John Doe',
    componentType: 'essay',
    submitText: 'This is a test essay submission.',
  };

  const mockLogContext: LogContext = {
    logInfo: {
      submissionId: 'sub-123',
    },
    requestUri: '/v1/submissions',
    startTime: Date.now(),
    traceId: 'trace-123',
  };

  beforeEach(async () => {
    const mockSubmissionRepository = createMock<SubmissionRepository>();
    const mockAzureBlobStorageIntegration =
      createMock<AzureBlobStorageIntegration>();
    const mockAzureOpenAIIntegration = createMock<AzureOpenAIIntegration>();
    const mockFfmpegIntegration = createMock<FfmpegIntegration>();
    const mockLogger = createMock<LoggerService>();
    const mockReviewParser = createMock<ReviewParser>();
    const mockProcessor = createMock<Processor>();
    const mockReviewService = createMock<ReviewService>();

    // Mock processor to return the input directly
    mockProcessor.process.mockImplementation(async (promise) => {
      const result = await promise;
      return result;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: SubmissionRepository,
          useValue: mockSubmissionRepository,
        },
        {
          provide: AzureBlobStorageIntegration,
          useValue: mockAzureBlobStorageIntegration,
        },
        {
          provide: AzureOpenAIIntegration,
          useValue: mockAzureOpenAIIntegration,
        },
        {
          provide: FfmpegIntegration,
          useValue: mockFfmpegIntegration,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: MediaService,
          useValue: createMock<MediaService>(),
        },
        {
          provide: ReviewService,
          useValue: mockReviewService,
        },
        {
          provide: ReviewParser,
          useValue: mockReviewParser,
        },
        {
          provide: Processor,
          useValue: mockProcessor,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    submissionRepository = module.get(SubmissionRepository);
    azureBlobStorageIntegration = module.get(AzureBlobStorageIntegration);
    azureOpenAIIntegration = module.get(AzureOpenAIIntegration);
    ffmpegIntegration = module.get(FfmpegIntegration);
    reviewParser = module.get(ReviewParser);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process new submission successfully', async () => {
    // Mock the dependencies properly
    const mockReviewService = createMock<ReviewService>();
    const mockMediaService = createMock<MediaService>();

    // Mock checkAlreadySubmitted to return null (no existing submission)
    submissionRepository.checkAlreadySubmitted.mockResolvedValue(null);

    // Mock createSubmission
    submissionRepository.createSubmission.mockResolvedValue('sub-123');

    // Mock mediaService.processMedia to return success
    mockMediaService.processMedia.mockResolvedValue({
      success: true,
      data: {
        videoSasUrl: 'https://blob.video.sas.url',
        audioSasUrl: 'https://blob.audio.sas.url',
      },
    });

    // Mock reviewService.review to return success
    mockReviewService.review.mockResolvedValue({
      success: true,
      data: {
        message: 'Submission processed successfully',
        score: 8,
        feedback: 'Good essay',
        highlights: ['grammar'],
        highlightedText: 'This is a test essay submission.',
        videoUrl: 'https://blob.video.sas.url',
        audioUrl: 'https://blob.audio.sas.url',
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        studentName: 'John Doe',
        submitText: 'This is a test essay submission.',
      },
    });

    // Create a new module with the mocked services
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: SubmissionRepository,
          useValue: submissionRepository,
        },
        {
          provide: ReviewService,
          useValue: mockReviewService,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: Processor,
          useValue: createMock<Processor>(),
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);

    const result = await service.newSubmission(
      mockVideoFile,
      mockSubmissionDto,
      mockLogContext,
    );

    expect(result.success).toBe(true);
  });

  it('should return error when student already submitted', async () => {
    submissionRepository.checkAlreadySubmitted.mockResolvedValue({
      id: 'existing-sub',
    });

    const result = await service.newSubmission(
      mockVideoFile,
      mockSubmissionDto,
      mockLogContext,
    );

    expect(result.success).toBe(false);
  });
});
