import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { Processor } from 'src/score/helper/processor/processor';
import { FfmpegIntegration } from 'src/score/IO/integrations/ffmpeg.integration';
import { AzureBlobStorageIntegration } from 'src/score/IO/integrations/azure-blob-storage.integration';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { createMock } from '@golevelup/ts-jest';
import { MediaType } from '@prisma/client';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log-context/log.context';

describe('MediaService', () => {
  let service: MediaService;
  let processor: jest.Mocked<Processor>;
  let ffmpegIntegration: jest.Mocked<FfmpegIntegration>;
  let azureBlobStorageIntegration: jest.Mocked<AzureBlobStorageIntegration>;
  let submissionRepository: jest.Mocked<SubmissionRepository>;

  beforeEach(async () => {
    const mockProcessor = createMock<Processor>();
    const mockFfmpegIntegration = createMock<FfmpegIntegration>();
    const mockAzureBlobStorageIntegration =
      createMock<AzureBlobStorageIntegration>();
    const mockSubmissionRepository = createMock<SubmissionRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: Processor,
          useValue: mockProcessor,
        },
        {
          provide: FfmpegIntegration,
          useValue: mockFfmpegIntegration,
        },
        {
          provide: AzureBlobStorageIntegration,
          useValue: mockAzureBlobStorageIntegration,
        },
        {
          provide: SubmissionRepository,
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    processor = module.get(Processor);
    ffmpegIntegration = module.get(FfmpegIntegration);
    azureBlobStorageIntegration = module.get(AzureBlobStorageIntegration);
    submissionRepository = module.get(SubmissionRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMedia', () => {
    const mockLogContext: LogContext<NewSubmissionLogInfo> = {
      traceId: 'test-trace-id',
      requestUri: '/test/uri',
      startTime: Date.now(),
      logInfo: {
        submissionId: 'test-submission-id',
      },
    };

    it('should process media successfully', async () => {
      // Arrange
      const videoPath = '/path/to/video.mp4';

      // Mock successful video processing
      ffmpegIntegration.processVideo.mockResolvedValue({
        success: true,
        data: {
          localVideoPath: '/processed/video.mp4',
          localAudioPath: '/processed/audio.mp3',
          originalDuration: 120,
          processedDuration: 120,
        },
      });

      // Mock successful video upload
      azureBlobStorageIntegration.uploadFile.mockResolvedValue({
        success: true,
        data: {
          videoFileUrl: 'https://blob.com/video.mp4',
          videoSasUrl: 'https://blob.com/video.mp4?sas',
          videoFileSize: 1024,
        },
      });

      // Mock successful audio upload
      azureBlobStorageIntegration.uploadFile.mockResolvedValue({
        success: true,
        data: {
          audioFileUrl: 'https://blob.com/audio.mp3',
          audioSasUrl: 'https://blob.com/audio.mp3?sas',
          audioFileSize: 512,
        },
      });

      // Mock processor.process to return success for video processing
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          localVideoPath: '/processed/video.mp4',
          localAudioPath: '/processed/audio.mp3',
          originalDuration: 120,
          processedDuration: 120,
        },
      });

      // Mock processor.process to return success for video upload
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          videoFileUrl: 'https://blob.com/video.mp4',
          videoSasUrl: 'https://blob.com/video.mp4?sas',
          videoFileSize: 1024,
        },
      });

      // Mock processor.process to return success for audio upload
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          audioFileUrl: 'https://blob.com/audio.mp3',
          audioSasUrl: 'https://blob.com/audio.mp3?sas',
          audioFileSize: 512,
        },
      });

      // Act
      const result = await service.processMedia(videoPath, mockLogContext);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.videoSasUrl).toBe('https://blob.com/video.mp4?sas');
        expect(result.data.audioSasUrl).toBe('https://blob.com/audio.mp3?sas');
      }
      expect(ffmpegIntegration.processVideo).toHaveBeenCalledWith({
        inputFilePath: videoPath,
        submissionId: 'test-submission-id',
      });
      expect(submissionRepository.createSubmissionMedia).toHaveBeenCalledWith(
        'test-submission-id',
        MediaType.VIDEO,
        'https://blob.com/video.mp4',
        'https://blob.com/video.mp4?sas',
        1024,
      );
      expect(submissionRepository.createSubmissionMedia).toHaveBeenCalledWith(
        'test-submission-id',
        MediaType.AUDIO,
        'https://blob.com/audio.mp3',
        'https://blob.com/audio.mp3?sas',
        512,
      );
    });

    it('should return error when video processing fails', async () => {
      // Arrange
      const videoPath = '/path/to/video.mp4';

      // Mock failed video processing
      ffmpegIntegration.processVideo.mockResolvedValue({
        success: false,
        error: 'Video processing failed',
      });

      // Mock processor.process to return failure
      processor.process.mockResolvedValueOnce({
        success: false,
        error: 'Video processing failed',
      });

      // Act
      const result = await service.processMedia(videoPath, mockLogContext);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Video processing failed');
      }
      expect(azureBlobStorageIntegration.uploadFile).not.toHaveBeenCalled();
      expect(submissionRepository.createSubmissionMedia).not.toHaveBeenCalled();
    });

    it('should return error when video upload fails', async () => {
      // Arrange
      const videoPath = '/path/to/video.mp4';

      // Mock successful video processing
      ffmpegIntegration.processVideo.mockResolvedValue({
        success: true,
        data: {
          localVideoPath: '/processed/video.mp4',
          localAudioPath: '/processed/audio.mp3',
          originalDuration: 120,
          processedDuration: 120,
        },
      });

      // Mock failed video upload
      azureBlobStorageIntegration.uploadFile.mockResolvedValue({
        success: false,
        error: 'Video upload failed',
      });

      // Mock processor.process to return success for video processing
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          localVideoPath: '/processed/video.mp4',
          localAudioPath: '/processed/audio.mp3',
          originalDuration: 120,
          processedDuration: 120,
        },
      });

      // Mock processor.process to return failure for video upload
      processor.process.mockResolvedValueOnce({
        success: false,
        error: 'Video upload failed',
      });

      // Act
      const result = await service.processMedia(videoPath, mockLogContext);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Video upload failed');
      }
      expect(submissionRepository.createSubmissionMedia).not.toHaveBeenCalled();
    });
  });
});
