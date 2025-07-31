import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AzureOpenAIIntegration } from '../../src/score/IO/integrations/azure-openai.integration';
import { LoggerService } from '../../src/common/logger/logger.service';
import { ExternalLogger } from '../../src/score/helper/external-logger/external.logger';
import { LogContext } from '../../src/common/decorators/param/log-context/log.context';

describe('AzureOpenAIIntegration', () => {
  let integration: AzureOpenAIIntegration;
  let logger: LoggerService;
  let externalLogger: ExternalLogger;

  const mockLogContext: LogContext = {
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
        AzureOpenAIIntegration,
        {
          provide: LoggerService,
          useValue: {
            trace: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: ExternalLogger,
          useValue: {
            logExternalCall: jest.fn(),
          },
        },
      ],
    }).compile();

    module.init();

    integration = module.get<AzureOpenAIIntegration>(AzureOpenAIIntegration);
    logger = module.get<LoggerService>(LoggerService);
    externalLogger = module.get<ExternalLogger>(ExternalLogger);
  });

  describe('#getRawReviewResponse', () => {
    it('should successfully get a review response from Azure OpenAI', async () => {
      // Arrange
      const testPrompt =
        'Please review this essay and provide feedback on grammar and structure.';

      // Act
      const result = await integration.getRawReviewResponse(
        testPrompt,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.reviewPrompt).toBe(testPrompt);
        expect(result.data.reviewResponse).toBeDefined();
        expect(typeof result.data.reviewResponse).toBe('string');
        expect(result.data.reviewResponse.length).toBeGreaterThan(0);
      }
    });

    it('should handle different types of review prompts', async () => {
      // Arrange
      const differentPrompt =
        'Analyze the content quality and provide suggestions for improvement.';

      // Act
      const result = await integration.getRawReviewResponse(
        differentPrompt,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reviewPrompt).toBe(differentPrompt);
        expect(result.data.reviewResponse).toBeDefined();
      }
    });
  });
});
