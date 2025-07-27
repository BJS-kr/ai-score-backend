import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AzureOpenAIIntegration } from './score/IO/integrations/azure-openai.integration';
import { AzureBlobStorageIntegration } from './score/IO/integrations/azure-blob-storage.integration';
import { VideoService } from './score/IO/integrations/ffmpeg-video-processing.integration';
import { DbModule } from './system/database/db.module';
import { LoggerService } from './common/logger/logger.service';
import { setupGlobalGuardrail } from './system/setup/guardrail';
import { APP_PROVIDERS } from './common/providers';
import { ScoreModule } from './score/score.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScoreModule,
    LoggerModule,
  ],
  providers: [...APP_PROVIDERS],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}

  onModuleInit() {
    setupGlobalGuardrail(this.logger);
  }
}
