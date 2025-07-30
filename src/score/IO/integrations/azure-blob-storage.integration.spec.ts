import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AzureBlobStorageIntegration } from './azure-blob-storage.integration';
import { LoggerService } from 'src/common/logger/logger.service';
import { ExternalLogger } from '../../helper/external-logger/external.logger';
import { createMock } from '@golevelup/ts-jest';

jest.mock('@azure/storage-blob');
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
}));

describe('AzureBlobStorageIntegration', () => {
  let service: AzureBlobStorageIntegration;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();
    const mockExternalLogger = createMock<ExternalLogger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureBlobStorageIntegration,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: ExternalLogger,
          useValue: mockExternalLogger,
        },
      ],
    }).compile();

    service = module.get<AzureBlobStorageIntegration>(
      AzureBlobStorageIntegration,
    );
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have uploadFile method', () => {
    expect(typeof service.uploadFile).toBe('function');
  });
});
