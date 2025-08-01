import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-jest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { FfmpegService } from './ffmpeg.service';

// Mock all external dependencies
jest.mock('fluent-ffmpeg');
jest.mock('node:fs/promises');
jest.mock('node:fs');
jest.mock('ffprobe-static');
jest.mock('ffmpeg-static', () => '/path/to/ffmpeg');

const mockedFs = <jest.Mocked<typeof fs>>fs;
const mockedFsPromises = <jest.Mocked<typeof fsPromises>>fsPromises;

describe('VideoService', () => {
  let service: FfmpegService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FfmpegService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FfmpegService>(FfmpegService);
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
      mockedFs.existsSync.mockReturnValue(false);

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('video.tempDirectory');
      expect(configService.get).toHaveBeenCalledWith('video.maxFileSizeMB');
      expect(mockedFs.existsSync).toHaveBeenCalledWith('./temp');
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('./temp', {
        recursive: true,
      });
    });

    it('should initialize with custom configuration', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('/custom/temp') // tempDirectory
        .mockReturnValueOnce(1000); // maxFileSizeMB
      mockedFs.existsSync.mockReturnValue(false);

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('video.tempDirectory');
      expect(configService.get).toHaveBeenCalledWith('video.maxFileSizeMB');
      expect(mockedFs.existsSync).toHaveBeenCalledWith('/custom/temp');
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/custom/temp', {
        recursive: true,
      });
    });

    it('should not create directory if it already exists', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);
      mockedFs.existsSync.mockReturnValue(true);

      // Act
      service.onModuleInit();

      // Assert
      expect(mockedFs.existsSync).toHaveBeenCalledWith('./temp');
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('cleanupFile', () => {
    it('should return success when file exists and is deleted', async () => {
      // Arrange
      mockedFs.existsSync.mockReturnValue(true);
      mockedFsPromises.unlink.mockResolvedValue(undefined);

      // Act
      const result = await service.cleanupFile('/path/to/file.mp4');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/file.mp4');
      expect(mockedFsPromises.unlink).toHaveBeenCalledWith('/path/to/file.mp4');
    });

    it('should return success when file does not exist', async () => {
      // Arrange
      mockedFs.existsSync.mockReturnValue(false);

      // Act
      const result = await service.cleanupFile('/path/to/nonexistent.mp4');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        '/path/to/nonexistent.mp4',
      );
    });
  });
});
