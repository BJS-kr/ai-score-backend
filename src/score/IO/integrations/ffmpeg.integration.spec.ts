import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FfmpegIntegration } from './ffmpeg.integration';
import { createMock } from '@golevelup/ts-jest';

// Mock all external dependencies
jest.mock('fluent-ffmpeg');
jest.mock('node:fs/promises');
jest.mock('node:fs');
jest.mock('ffprobe-static');
jest.mock('ffmpeg-static', () => '/path/to/ffmpeg');

describe('VideoService', () => {
  let service: FfmpegIntegration;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FfmpegIntegration,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FfmpegIntegration>(FfmpegIntegration);
    configService = module.get(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize with default configuration', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);
      const fs = require('node:fs');
      fs.existsSync.mockReturnValue(false);

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('video.tempDirectory');
      expect(configService.get).toHaveBeenCalledWith('video.maxFileSizeMB');
      expect(fs.existsSync).toHaveBeenCalledWith('./temp');
      expect(fs.mkdirSync).toHaveBeenCalledWith('./temp', { recursive: true });
    });

    it('should initialize with custom configuration', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('/custom/temp') // tempDirectory
        .mockReturnValueOnce(1000); // maxFileSizeMB
      const fs = require('node:fs');
      fs.existsSync.mockReturnValue(false);

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('video.tempDirectory');
      expect(configService.get).toHaveBeenCalledWith('video.maxFileSizeMB');
      expect(fs.existsSync).toHaveBeenCalledWith('/custom/temp');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/custom/temp', {
        recursive: true,
      });
    });

    it('should not create directory if it already exists', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);
      const fs = require('node:fs');
      fs.existsSync.mockReturnValue(true);

      // Act
      service.onModuleInit();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith('./temp');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('cleanupFile', () => {
    it('should return success when file exists and is deleted', async () => {
      // Arrange
      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');

      fs.existsSync.mockReturnValue(true);
      fsPromises.unlink.mockResolvedValue(undefined);

      // Act
      const result = await service.cleanupFile('/path/to/file.mp4');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.mp4');
      expect(fsPromises.unlink).toHaveBeenCalledWith('/path/to/file.mp4');
    });

    it('should return success when file does not exist', async () => {
      // Arrange
      const fs = require('node:fs');
      fs.existsSync.mockReturnValue(false);

      // Act
      const result = await service.cleanupFile('/path/to/nonexistent.mp4');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/nonexistent.mp4');
    });
  });

  describe('processVideo validation', () => {
    it('should return error when input file validation fails', async () => {
      // Arrange
      const fs = require('node:fs');
      fs.existsSync.mockReturnValue(false);

      // Act
      const result = await service.processVideo({
        inputFilePath: '/path/to/nonexistent.mp4',
        submissionId: 'test-submission',
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Input file does not exist');
      }
    });

    it('should return error when file is not MP4', async () => {
      // Arrange
      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024 * 1024,
      });

      // Initialize service with proper config
      configService.get.mockReturnValue(500); // maxFileSizeMB
      service.onModuleInit();

      // Act
      const result = await service.processVideo({
        inputFilePath: '/path/to/video.avi',
        submissionId: 'test-submission',
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Input file is not a video file');
      }
    });

    it('should return error when file size exceeds limit', async () => {
      // Arrange
      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024 * 1024 * 1024,
      }); // 1GB

      // Initialize service with proper config
      configService.get.mockReturnValue(500); // maxFileSizeMB
      service.onModuleInit();

      // Act
      const result = await service.processVideo({
        inputFilePath: '/path/to/large-video.mp4',
        submissionId: 'test-submission',
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('File size');
        expect(result.error).toContain('exceeds maximum allowed size');
      }
    }, 15000); // Increase timeout

    it('should return error when file is not a file (is directory)', async () => {
      // Arrange
      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => false,
        size: 1024 * 1024,
      });

      // Initialize service with proper config
      configService.get.mockReturnValue(500); // maxFileSizeMB
      service.onModuleInit();

      // Act
      const result = await service.processVideo({
        inputFilePath: '/path/to/directory.mp4',
        submissionId: 'test-submission',
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Input path is not a file');
      }
    });

    it('should return error when file validation throws an exception', async () => {
      // Arrange
      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockRejectedValue(new Error('Permission denied'));

      // Initialize service with proper config
      configService.get.mockReturnValue(500); // maxFileSizeMB
      service.onModuleInit();

      // Act
      const result = await service.processVideo({
        inputFilePath: '/path/to/error.mp4',
        submissionId: 'test-submission',
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('File validation failed');
        expect(result.error).toContain('Permission denied');
      }
    });

    it('should return error when file validation throws non-Error exception', async () => {
      // Arrange
      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockRejectedValue('String error');

      // Initialize service with proper config
      configService.get.mockReturnValue(500); // maxFileSizeMB
      service.onModuleInit();

      // Act
      const result = await service.processVideo({
        inputFilePath: '/path/to/error.mp4',
        submissionId: 'test-submission',
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('File validation failed');
        expect(result.error).toContain('"String error"');
      }
    });
  });

  describe('getVideoInfo', () => {
    it('should return video info successfully', async () => {
      // Arrange
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(null, {
          streams: [
            {
              codec_type: 'video',
              width: 1920,
              height: 1080,
            },
          ],
          format: {
            duration: 60.5,
            format_name: 'mp4',
            bit_rate: '1000000',
          },
        });
      });

      // Act
      const result = await service.getVideoInfo('/path/to/video.mp4');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(60.5);
        expect(result.data.width).toBe(1920);
        expect(result.data.height).toBe(1080);
        expect(result.data.format).toBe('mp4');
        expect(result.data.bitrate).toBe(1000000);
      }
    });

    it('should return error when ffprobe fails', async () => {
      // Arrange
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(new Error('FFprobe failed'), null);
      });

      // Act
      const result = await service.getVideoInfo('/path/to/video.mp4');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to get video info');
      }
    });

    it('should return error when no video stream found', async () => {
      // Arrange
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(null, {
          streams: [
            {
              codec_type: 'audio',
            },
          ],
          format: {
            duration: 60,
            format_name: 'mp4',
            bit_rate: '1000000',
          },
        });
      });

      // Act
      const result = await service.getVideoInfo('/path/to/audio-only.mp4');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No video stream found in file');
      }
    });

    it('should handle missing metadata fields', async () => {
      // Arrange
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(null, {
          streams: [
            {
              codec_type: 'video',
              // Missing width, height
            },
          ],
          format: {
            // Missing duration, format_name, bit_rate
          },
        });
      });

      // Act
      const result = await service.getVideoInfo('/path/to/video.mp4');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(0);
        expect(result.data.width).toBe(0);
        expect(result.data.height).toBe(0);
        expect(result.data.format).toBe('unknown');
        expect(result.data.bitrate).toBe(0);
      }
    });
  });

  describe('processVideo full flow', () => {
    beforeEach(() => {
      // Initialize service for processVideo tests
      configService.get
        .mockReturnValueOnce('./temp') // tempDirectory
        .mockReturnValueOnce(500); // maxFileSizeMB
      service.onModuleInit();
    });

    it('should return error when video info extraction fails', async () => {
      // Arrange
      const request = {
        inputFilePath: '/path/to/video.mp4',
        submissionId: 'test-submission',
      };

      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      const ffmpeg = require('fluent-ffmpeg');

      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
      });

      // Mock ffprobe to fail
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(new Error('FFprobe failed'), null);
      });

      // Act
      const result = await service.processVideo(request);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to get video info');
      }
    });

    it('should return error when video processing fails', async () => {
      // Arrange
      const request = {
        inputFilePath: '/path/to/video.mp4',
        submissionId: 'test-submission',
      };

      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      const ffmpeg = require('fluent-ffmpeg');

      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
      });

      // Mock successful ffprobe
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(null, {
          streams: [
            {
              codec_type: 'video',
              width: 1920,
              height: 1080,
            },
          ],
          format: {
            duration: 60,
            format_name: 'mp4',
            bit_rate: '1000000',
          },
        });
      });

      // Mock ffmpeg to fail
      const mockFfmpeg = {
        videoFilter: jest.fn().mockReturnThis(),
        videoCodec: jest.fn().mockReturnThis(),
        outputOptions: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event: string, callback: any) => {
          if (event === 'error') {
            callback(new Error('Video processing failed'));
          }
          return mockFfmpeg;
        }),
        run: jest.fn(),
      };
      ffmpeg.mockReturnValue(mockFfmpeg);

      // Act
      const result = await service.processVideo(request);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Video processing failed');
      }
    });

    it('should return error when audio extraction fails', async () => {
      // Arrange
      const request = {
        inputFilePath: '/path/to/video.mp4',
        submissionId: 'test-submission',
      };

      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      const ffmpeg = require('fluent-ffmpeg');

      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
      });

      // Mock successful ffprobe
      ffmpeg.ffprobe.mockImplementation((filePath: string, callback: any) => {
        callback(null, {
          streams: [
            {
              codec_type: 'video',
              width: 1920,
              height: 1080,
            },
          ],
          format: {
            duration: 60,
            format_name: 'mp4',
            bit_rate: '1000000',
          },
        });
      });

      // Mock successful video processing
      const mockVideoFfmpeg = {
        videoFilter: jest.fn().mockReturnThis(),
        videoCodec: jest.fn().mockReturnThis(),
        outputOptions: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event: string, callback: any) => {
          if (event === 'end') {
            callback();
          }
          return mockVideoFfmpeg;
        }),
        run: jest.fn(),
      };

      // Mock failed audio extraction
      const mockAudioFfmpeg = {
        noVideo: jest.fn().mockReturnThis(),
        audioCodec: jest.fn().mockReturnThis(),
        audioBitrate: jest.fn().mockReturnThis(),
        audioFrequency: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event: string, callback: any) => {
          if (event === 'error') {
            callback(new Error('Audio extraction failed'));
          }
          return mockAudioFfmpeg;
        }),
        run: jest.fn(),
      };

      ffmpeg
        .mockReturnValueOnce(mockVideoFfmpeg)
        .mockReturnValueOnce(mockAudioFfmpeg);

      // Act
      const result = await service.processVideo(request);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Audio extraction failed');
      }
    });

    it('should return error when processed video info extraction fails', async () => {
      // Arrange
      const request = {
        inputFilePath: '/path/to/video.mp4',
        submissionId: 'test-submission',
      };

      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');
      const ffmpeg = require('fluent-ffmpeg');

      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
      });

      // Mock successful ffprobe for original video
      ffmpeg.ffprobe.mockImplementationOnce(
        (filePath: string, callback: any) => {
          callback(null, {
            streams: [
              {
                codec_type: 'video',
                width: 1920,
                height: 1080,
              },
            ],
            format: {
              duration: 60,
              format_name: 'mp4',
              bit_rate: '1000000',
            },
          });
        },
      );

      // Mock successful video and audio processing
      const mockVideoFfmpeg = {
        videoFilter: jest.fn().mockReturnThis(),
        videoCodec: jest.fn().mockReturnThis(),
        outputOptions: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event: string, callback: any) => {
          if (event === 'end') {
            callback();
          }
          return mockVideoFfmpeg;
        }),
        run: jest.fn(),
      };

      const mockAudioFfmpeg = {
        noVideo: jest.fn().mockReturnThis(),
        audioCodec: jest.fn().mockReturnThis(),
        audioBitrate: jest.fn().mockReturnThis(),
        audioFrequency: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event: string, callback: any) => {
          if (event === 'end') {
            callback();
          }
          return mockAudioFfmpeg;
        }),
        run: jest.fn(),
      };

      ffmpeg
        .mockReturnValueOnce(mockVideoFfmpeg)
        .mockReturnValueOnce(mockAudioFfmpeg);

      // Mock failed ffprobe for processed video
      ffmpeg.ffprobe.mockImplementationOnce(
        (filePath: string, callback: any) => {
          callback(new Error('Processed video ffprobe failed'), null);
        },
      );

      // Act
      const result = await service.processVideo(request);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to get video info');
      }
    });

    it('should handle unexpected errors in processVideo', async () => {
      // Arrange
      const request = {
        inputFilePath: '/path/to/video.mp4',
        submissionId: 'test-submission',
      };

      const fs = require('node:fs');
      const fsPromises = require('node:fs/promises');

      fs.existsSync.mockReturnValue(true);
      fsPromises.stat.mockRejectedValue('Unexpected error');

      // Act
      const result = await service.processVideo(request);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('File validation failed');
      }
    });
  });
});
