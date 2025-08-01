import { Module } from '@nestjs/common';
import { StatisticsRepository } from './respositories/statistics.repository';
import { RevisionRepository } from './respositories/revision.repository';
import { ExternalCallLogRepository } from './respositories/external.call.log.repository';
import { SubmissionRepository } from './respositories/submission.respository';
import { AzureBlobStorageService } from './integrations/azure-blob-storage/azure-blob-storage.service';
import { AzureOpenAIService } from './integrations/azure-openai/azure-openai.service';
import { FfmpegService } from './integrations/ffmpeg/ffmpeg.service';

const repositories = [
  SubmissionRepository,
  ExternalCallLogRepository,
  RevisionRepository,
  StatisticsRepository,
];

const integrations = [
  AzureBlobStorageService,
  AzureOpenAIService,
  FfmpegService,
];

@Module({
  providers: [...repositories, ...integrations],
  exports: [...repositories, ...integrations],
})
export class ScoreIoModule {}
