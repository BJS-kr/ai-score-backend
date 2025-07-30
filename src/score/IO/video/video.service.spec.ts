import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VideoService } from './video.service';
import { createMock } from '@golevelup/ts-jest';

// Mock all external dependencies
jest.mock('fluent-ffmpeg');
jest.mock('node:fs/promises');
jest.mock('node:fs');
jest.mock('ffprobe-static');
jest.mock('ffmpeg-static', () => '/path/to/ffmpeg');

describe('VideoService', () => {
  let service: VideoService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
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
});
