import { Module } from '@nestjs/common';
import { ScoreRouterModule } from './router/score.router.module';
import { ScoreCronModule } from './cron/score.cron.module';

@Module({
  imports: [ScoreRouterModule, ScoreCronModule],
})
export class ScoreModule {}
