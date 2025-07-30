import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAIIntegration } from './azure-openai.integration';
import { LoggerService } from 'src/common/logger/logger.service';
import { ExternalLogger } from '../../helper/external-logger/external.logger';
import { createMock } from '@golevelup/ts-jest';

jest.mock('openai');

describe('AzureOpenAIIntegration', () => {
  let service: AzureOpenAIIntegration;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();
    const mockLoggerService = createMock<LoggerService>();
    const mockExternalLogger = createMock<ExternalLogger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureOpenAIIntegration,
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

    service = module.get<AzureOpenAIIntegration>(AzureOpenAIIntegration);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have getRawReviewResponse method', () => {
    expect(typeof service.getRawReviewResponse).toBe('function');
  });
});
