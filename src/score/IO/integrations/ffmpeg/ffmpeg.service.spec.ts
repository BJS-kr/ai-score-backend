import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-jest';
import * as fs from 'node:fs';
import { FfmpegService } from './ffmpeg.service';

// Mock all external dependencies
jest.mock('fluent-ffmpeg');
jest.mock('node:fs');
jest.mock('ffprobe-static');
jest.mock('ffmpeg-static', () => '/path/to/ffmpeg');

const mockedFs = <jest.Mocked<typeof fs>>fs;

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
      expect(configService.get).toHaveBeenCalledWith('TEMP_DIR');
      expect(configService.get).toHaveBeenCalledWith('MAX_FILE_SIZE_MB');
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
      expect(configService.get).toHaveBeenCalledWith('TEMP_DIR');
      expect(configService.get).toHaveBeenCalledWith('MAX_FILE_SIZE_MB');
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
});
