import { Module } from '@nestjs/common';
import { AzureBlobStorageService } from './azure-blob-storage/azure-blob-storage.service';
import { AzureOpenAIService } from './azure-openai/azure-openai.service';
import { FfmpegService } from './ffmpeg/ffmpeg.service';
import { ScoreHelperModule } from '../../helper/score.helper.module';

const integrations = [
  AzureBlobStorageService,
  AzureOpenAIService,
  FfmpegService,
];

@Module({
  imports: [ScoreHelperModule],
  providers: [...integrations],
  exports: [...integrations],
})
export class ScoreIntegrationModule {}
