import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAIService } from './azure-openai.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { ExternalLogger } from '../../../helper/external-logger/external.logger';
import { createMock } from '@golevelup/ts-jest';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';

jest.mock('openai', () => ({
  AzureOpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Test response',
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe('AzureOpenAIService', () => {
  let service: AzureOpenAIService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();
    const mockExternalLogger = createMock<ExternalLogger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureOpenAIService,
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

    service = module.get<AzureOpenAIService>(AzureOpenAIService);
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
        .mockReturnValueOnce('https://test-endpoint.com') // AZURE_ENDPOINT_URL
        .mockReturnValueOnce('test-api-key') // AZURE_ENDPOINT_KEY
        .mockReturnValueOnce('2023-12-01-preview') // OPENAI_API_VERSION
        .mockReturnValueOnce('test-deployment'); // AZURE_OPENAI_DEPLOYMENT_NAME

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('AZURE_ENDPOINT_URL');
      expect(configService.get).toHaveBeenCalledWith('AZURE_ENDPOINT_KEY');
      expect(configService.get).toHaveBeenCalledWith('OPENAI_API_VERSION');
      expect(configService.get).toHaveBeenCalledWith(
        'AZURE_OPENAI_DEPLOYMENT_NAME',
      );
    });

    it('should initialize with default API version', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('https://test-endpoint.com') // AZURE_ENDPOINT_URL
        .mockReturnValueOnce('test-api-key') // AZURE_ENDPOINT_KEY
        .mockReturnValueOnce(undefined) // OPENAI_API_VERSION - undefined
        .mockReturnValueOnce('test-deployment'); // AZURE_OPENAI_DEPLOYMENT_NAME

      // Act
      service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('OPENAI_API_VERSION');
    });

    it('should throw error when endpoint URL is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('') // AZURE_ENDPOINT_URL - empty string
        .mockReturnValueOnce('test-api-key') // AZURE_ENDPOINT_KEY
        .mockReturnValueOnce('2023-12-01-preview') // OPENAI_API_VERSION
        .mockReturnValueOnce('test-deployment'); // AZURE_OPENAI_DEPLOYMENT_NAME

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure OpenAI configuration is missing',
      );
    });

    it('should throw error when API key is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('https://test-endpoint.com') // AZURE_ENDPOINT_URL
        .mockReturnValueOnce('') // AZURE_ENDPOINT_KEY - empty string
        .mockReturnValueOnce('2023-12-01-preview') // OPENAI_API_VERSION
        .mockReturnValueOnce('test-deployment'); // AZURE_OPENAI_DEPLOYMENT_NAME

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure OpenAI configuration is missing',
      );
    });

    it('should throw error when deployment name is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('https://test-endpoint.com') // AZURE_ENDPOINT_URL
        .mockReturnValueOnce('test-api-key') // AZURE_ENDPOINT_KEY
        .mockReturnValueOnce('2023-12-01-preview') // OPENAI_API_VERSION
        .mockReturnValueOnce(''); // AZURE_OPENAI_DEPLOYMENT_NAME - empty string

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure OpenAI configuration is missing',
      );
    });

    it('should throw error when all configuration is missing', () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('') // AZURE_ENDPOINT_URL
        .mockReturnValueOnce('') // AZURE_ENDPOINT_KEY
        .mockReturnValueOnce('') // OPENAI_API_VERSION
        .mockReturnValueOnce(''); // AZURE_OPENAI_DEPLOYMENT_NAME

      // Act & Assert
      expect(() => service.onModuleInit()).toThrow(
        'Azure OpenAI configuration is missing',
      );
    });
  });

  describe('getRawReviewResponse', () => {
    const mockLogContext: LogContext = {
      logInfo: {
        submissionId: 'test-submission-id',
      },
      traceId: 'test-trace-id',
      requestUri: '/test/uri',
      startTime: Date.now(),
    };

    it('should have getRawReviewResponse method', () => {
      expect(typeof service.getRawReviewResponse).toBe('function');
    });

    it('should handle successful review response', async () => {
      // Arrange
      const reviewPrompt = 'Test review prompt';

      // Mock the internal methods by calling onModuleInit first
      configService.get
        .mockReturnValueOnce('https://test-endpoint.com')
        .mockReturnValueOnce('test-api-key')
        .mockReturnValueOnce('2023-12-01-preview')
        .mockReturnValueOnce('test-deployment');

      service.onModuleInit();

      // Act
      const result = await service.getRawReviewResponse(
        reviewPrompt,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true); // Should succeed with mocked dependencies
      if (result.success) {
        expect(result.data.reviewPrompt).toBe(reviewPrompt);
        expect(result.data.reviewResponse).toBe('Test response');
      }
    });
  });
});
