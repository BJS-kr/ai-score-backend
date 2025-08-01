import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AzureBlobStorageService } from './azure-blob-storage.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { ExternalLogger } from '../../../helper/external-logger/external.logger';
import { createMock } from '@golevelup/ts-jest';
import { MediaType } from '@prisma/client';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log-context/log.context';

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue({
      getContainerClient: jest.fn().mockReturnValue({
        createIfNotExists: jest.fn().mockResolvedValue({}),
        getBlockBlobClient: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({}),
          uploadData: jest.fn().mockResolvedValue({}),
          generateSasUrl: jest.fn().mockResolvedValue('test-sas-url'),
          url: 'test-url',
        }),
      }),
    }),
  },
  BlobSASPermissions: {
    Read: 'r',
    Write: 'w',
    parse: jest.fn().mockReturnValue('r'),
  },
}));
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
}));

describe('AzureBlobStorageService', () => {
  let service: AzureBlobStorageService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();
    const mockExternalLogger = createMock<ExternalLogger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureBlobStorageService,
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

    service = module.get<AzureBlobStorageService>(AzureBlobStorageService);
    configService = module.get(ConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize with valid configuration', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('test-account-key') // AZURE_ACCOUNT_KEY
        .mockReturnValueOnce('test-account-name') // AZURE_ACCOUNT_NAME
        .mockReturnValueOnce('test-container') // AZURE_CONTAINER
        .mockReturnValueOnce('test-connection-string'); // AZURE_CONNECTION_STRING

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('AZURE_ACCOUNT_KEY');
      expect(configService.get).toHaveBeenCalledWith('AZURE_ACCOUNT_NAME');
      expect(configService.get).toHaveBeenCalledWith('AZURE_CONTAINER');
      expect(configService.get).toHaveBeenCalledWith('AZURE_CONNECTION_STRING');
    });

    it('should throw error when account key is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('') // AZURE_ACCOUNT_KEY - empty
        .mockReturnValueOnce('test-account-name') // AZURE_ACCOUNT_NAME
        .mockReturnValueOnce('test-container') // AZURE_CONTAINER
        .mockReturnValueOnce('test-connection-string'); // AZURE_CONNECTION_STRING

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure Blob Storage configuration is missing',
      );
    });

    it('should throw error when account name is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('test-account-key') // AZURE_ACCOUNT_KEY
        .mockReturnValueOnce('') // AZURE_ACCOUNT_NAME - empty
        .mockReturnValueOnce('test-container') // AZURE_CONTAINER
        .mockReturnValueOnce('test-connection-string'); // AZURE_CONNECTION_STRING

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure Blob Storage configuration is missing',
      );
    });

    it('should throw error when container name is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('test-account-key') // AZURE_ACCOUNT_KEY
        .mockReturnValueOnce('test-account-name') // AZURE_ACCOUNT_NAME
        .mockReturnValueOnce('') // AZURE_CONTAINER - empty
        .mockReturnValueOnce('test-connection-string'); // AZURE_CONNECTION_STRING

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure Blob Storage configuration is missing',
      );
    });

    it('should throw error when connection string is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('test-account-key') // AZURE_ACCOUNT_KEY
        .mockReturnValueOnce('test-account-name') // AZURE_ACCOUNT_NAME
        .mockReturnValueOnce('test-container') // AZURE_CONTAINER
        .mockReturnValueOnce(''); // AZURE_CONNECTION_STRING - empty

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure Blob Storage configuration is missing',
      );
    });

    it('should throw error when all configuration is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('') // AZURE_ACCOUNT_KEY
        .mockReturnValueOnce('') // AZURE_ACCOUNT_NAME
        .mockReturnValueOnce('') // AZURE_CONTAINER
        .mockReturnValueOnce(''); // AZURE_CONNECTION_STRING

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure Blob Storage configuration is missing',
      );
    });
  });

  describe('uploadFile', () => {
    const mockLogContext: LogContext<NewSubmissionLogInfo> = {
      logInfo: {
        submissionId: 'test-submission-id',
      },
      traceId: 'test-trace-id',
      requestUri: '/test/uri',
      startTime: Date.now(),
    };

    it('should have uploadFile method', () => {
      expect(typeof service.uploadFile).toBe('function');
    });

    it('should handle file upload for video type', async () => {
      // Arrange
      const filePath = '/path/to/video.mp4';
      const mediaType = MediaType.VIDEO;

      // Mock the internal methods by calling onModuleInit first
      configService.get
        .mockReturnValueOnce('test-account-key')
        .mockReturnValueOnce('test-account-name')
        .mockReturnValueOnce('test-container')
        .mockReturnValueOnce('test-connection-string');

      service.onModuleInit();

      // Act
      const result = await service.uploadFile(
        filePath,
        mediaType,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true); // Should succeed with mocked dependencies
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });
  });
});
