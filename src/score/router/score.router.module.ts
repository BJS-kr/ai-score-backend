import { Module } from '@nestjs/common';
import { SubmissionController } from './submissions/submissions.controller';
import { RevisionController } from './revisions/revision.controller';
import { ScoreCoreModule } from '../core/score.core.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';

@Module({
  imports: [
    ScoreCoreModule,
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
  controllers: [SubmissionController, RevisionController],
})
export class ScoreRouterModule {}
