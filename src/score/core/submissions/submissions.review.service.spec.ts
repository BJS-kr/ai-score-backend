import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsReviewService } from './submissions.review.service';
import { SubmissionRepository } from '../../IO/respositories/submission.respository';
import { AzureBlobStorageIntegration } from '../../IO/integrations/azure-blob-storage.integration';
import { AzureOpenAIIntegration } from '../../IO/integrations/azure-openai.integration';
import { FfmpegIntegration } from '../../IO/integrations/ffmpeg.integration';
import { LoggerService } from 'src/common/logger/logger.service';
import { ReviewParser } from './submissions.review.parser';
import { Processor } from 'src/score/helper/processor/processor';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import { LogContext } from 'src/common/decorators/param/log.context';
import { createMock } from '@golevelup/ts-jest';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      return descriptor;
    },
}));

describe('SubmissionsReviewService', () => {
  let service: SubmissionsReviewService;
  let submissionRepository: jest.Mocked<SubmissionRepository>;
  let azureBlobStorageIntegration: jest.Mocked<AzureBlobStorageIntegration>;
  let azureOpenAIIntegration: jest.Mocked<AzureOpenAIIntegration>;
  let ffmpegIntegration: jest.Mocked<FfmpegIntegration>;
  let reviewParser: jest.Mocked<ReviewParser>;
  let processor: jest.Mocked<Processor>;

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

    // Mock processor to return the input directly
    mockProcessor.process.mockImplementation(async (promise) => {
      const result = await promise;
      return result;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsReviewService,
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
          provide: ReviewParser,
          useValue: mockReviewParser,
        },
        {
          provide: Processor,
          useValue: mockProcessor,
        },
      ],
    }).compile();

    service = module.get<SubmissionsReviewService>(SubmissionsReviewService);
    submissionRepository = module.get(SubmissionRepository);
    azureBlobStorageIntegration = module.get(AzureBlobStorageIntegration);
    azureOpenAIIntegration = module.get(AzureOpenAIIntegration);
    ffmpegIntegration = module.get(FfmpegIntegration);
    reviewParser = module.get(ReviewParser);
    processor = module.get(Processor);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process new submission successfully', async () => {
    submissionRepository.checkAlreadySubmitted.mockResolvedValue(null);
    submissionRepository.createSubmission.mockResolvedValue('sub-123');

    ffmpegIntegration.processVideo.mockResolvedValue({
      success: true,
      data: {
        localVideoPath: '/tmp/processed-video.mp4',
        localAudioPath: '/tmp/processed-audio.mp3',
        originalDuration: 60,
        processedDuration: 60,
      },
    });

    azureBlobStorageIntegration.uploadFile
      .mockResolvedValueOnce({
        success: true,
        data: {
          videoFileUrl: 'https://blob.video.url',
          videoSasUrl: 'https://blob.video.sas.url',
          videoFileSize: 1024,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          audioFileUrl: 'https://blob.audio.url',
          audioSasUrl: 'https://blob.audio.sas.url',
          audioFileSize: 512,
        },
      });

    azureOpenAIIntegration.getRawReviewResponse.mockResolvedValue({
      success: true,
      data: {
        reviewPrompt: 'Test prompt',
        reviewResponse:
          '{"score": 8, "feedback": "Good essay", "highlights": ["grammar"]}',
      },
    });

    reviewParser.parseAndValidateReview.mockReturnValue({
      success: true,
      data: {
        score: 8,
        feedback: 'Good essay',
        highlights: ['grammar'],
      },
    });

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
      studentId: '123e4567-e89b-12d3-a456-426614174000',
      componentType: 'essay',
    } as any);

    const result = await service.newSubmission(
      mockVideoFile,
      mockSubmissionDto,
      mockLogContext,
    );

    expect(result.success).toBe(false);
  });

  it('should submit for review successfully', async () => {
    azureOpenAIIntegration.getRawReviewResponse.mockResolvedValue({
      success: true,
      data: {
        reviewPrompt: 'Test prompt',
        reviewResponse:
          '{"score": 8, "feedback": "Good essay", "highlights": ["grammar"]}',
      },
    });

    reviewParser.parseAndValidateReview.mockReturnValue({
      success: true,
      data: {
        score: 8,
        feedback: 'Good essay',
        highlights: ['grammar'],
      },
    });

    const result = await service.submitForReview(
      'This is a test essay with grammar.',
      mockLogContext,
      'video-url',
      'audio-url',
      'student-id',
      'student-name',
    );

    expect(result.success).toBe(true);
  });
});
