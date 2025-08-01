import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from '../../src/common/logger/logger.service';
import { ExternalLogger } from '../../src/score/helper/external-logger/external.logger';
import { MediaType } from '@prisma/client';
import {
  LogContext,
  NewSubmissionLogInfo,
} from '../../src/common/decorators/param/log-context/log.context';
import * as path from 'path';
import { createMock } from '@golevelup/ts-jest';
import { AzureBlobStorageService } from 'src/score/IO/integrations/azure-blob-storage/azure-blob-storage.service';

describe('AzureBlobStorageService', () => {
  let integration: AzureBlobStorageService;

  const mockLogContext: LogContext<NewSubmissionLogInfo> = {
    traceId: 'test-trace-id',
    requestUri: '/test',
    startTime: Date.now(),
    logInfo: {
      submissionId: 'test-submission-123',
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
        }),
      ],
      providers: [
        AzureBlobStorageService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: ExternalLogger,
          useValue: createMock<ExternalLogger>(),
        },
      ],
    }).compile();

    await module.init();

    integration = module.get<AzureBlobStorageService>(AzureBlobStorageService);
  });

  describe('#uploadFile', () => {
    it('should successfully upload a video file', async () => {
      // Arrange
      const sampleVideoPath = path.join(__dirname, 'sample-videos', '1.mp4');
      const mediaType = MediaType.VIDEO;

      // Act
      const result = await integration.uploadFile(
        sampleVideoPath,
        mediaType,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.videoFileUrl).toBeDefined();
        expect(result.data.videoSasUrl).toBeDefined();
        expect(result.data.videoFileSize).toBeGreaterThan(0);
      }
    });

    it('should successfully upload an audio file', async () => {
      // Arrange
      const sampleVideoPath = path.join(__dirname, 'sample-videos', '2.mp4');
      const mediaType = MediaType.AUDIO;

      // Act
      const result = await integration.uploadFile(
        sampleVideoPath,
        mediaType,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.audioFileUrl).toBeDefined();
        expect(result.data.audioSasUrl).toBeDefined();
        expect(result.data.audioFileSize).toBeGreaterThan(0);
      }
    });
  });
});
