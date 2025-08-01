import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { BullModule } from '@nestjs/bullmq';
import { JOB_NAME } from './cron/constants/job.constants';
import { ScoreRouterModule } from './router/score.router.module';
import { ScoreCoreModule } from './core/score.core.module';
import { ScoreCronModule } from './cron/score.cron.module';
import { ScoreIoModule } from './IO/score.io.moule';
import { ScoreHelperModule } from './helper/score.helper.module';

@Module({
  imports: [
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
    BullModule.registerQueue({
      configKey: 'ai-score-queue',
      name: JOB_NAME.CRON_REVIEW,
    }),
    ScoreRouterModule,
    ScoreCoreModule,
    ScoreCronModule,
    ScoreIoModule,
    ScoreHelperModule,
  ],
})
export class ScoreModule {}
