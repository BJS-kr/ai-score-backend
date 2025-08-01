import { Module } from '@nestjs/common';
import { Processor } from './processor/processor';
import { ExternalLogger } from './external-logger/external.logger';
import { ScoreRepositoryModule } from '../IO/respositories/score.repository.module';

@Module({
  imports: [ScoreRepositoryModule],
  providers: [Processor, ExternalLogger],
  exports: [Processor, ExternalLogger],
})
export class ScoreHelperModule {}
