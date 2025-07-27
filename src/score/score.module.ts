import { Module } from '@nestjs/common';
import { ScoreController } from './router/score.controller';
import { ScoreService } from './core/review.service';
import { AzureBlobStorageIntegration } from './IO/integrations/azure-blob-storage.integration';
import { VideoService } from './IO/integrations/ffmpeg-video-processing.integration';
import { AzureOpenAIIntegration } from './IO/integrations/azure-openai.integration';
import { DbModule } from 'src/system/database/db.module';
import { StricterHelper } from 'src/internal/stricter/stricter';
import { ScoreRepository } from './IO/respositories/score.respository';

@Module({
  imports: [DbModule],
  controllers: [ScoreController],
  providers: [
    ScoreService,
    ScoreRepository,
    AzureOpenAIIntegration,
    AzureBlobStorageIntegration,
    VideoService,
    StricterHelper,
  ],
})
export class ScoreModule {}
