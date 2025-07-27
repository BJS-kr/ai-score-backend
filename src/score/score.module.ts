import { Module } from '@nestjs/common';
import { ScoreController } from './router/score.controller';
import { ScoreService } from './core/submission/review.service';
import { AzureBlobStorageIntegration } from './IO/integrations/azure-blob-storage.integration';
import { VideoService } from './IO/video/video.service';
import { AzureOpenAIIntegration } from './IO/integrations/azure-openai.integration';
import { DbModule } from 'src/system/database/db.module';
import { Processor } from 'src/score/helper/processor/processor';
import { ScoreRepository } from './IO/respositories/score.respository';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ExternalCallLogRepository } from './IO/respositories/external.call.log.repository';
import { ReviewParser } from './core/submission/review.parser';

@Module({
  imports: [
    DbModule,
    MulterModule.register({
      storage: diskStorage({
        destination(req, file, callback) {
          callback(null, './uploads');
        },
        filename(req, file, callback) {
          callback(null, `${uuidv4()}-${file.originalname}`);
        },
      }),
    }),
  ],
  controllers: [ScoreController],
  providers: [
    ScoreService,
    ScoreRepository,
    ExternalCallLogRepository,
    AzureOpenAIIntegration,
    AzureBlobStorageIntegration,
    VideoService,
    Processor,
    ReviewParser,
  ],
})
export class ScoreModule {}
