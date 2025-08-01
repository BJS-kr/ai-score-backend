import { Module } from '@nestjs/common';
import { Processor } from './processor/processor';
import { ExternalLogger } from './external-logger/external.logger';

@Module({
  providers: [Processor, ExternalLogger],
  exports: [Processor, ExternalLogger],
})
export class ScoreHelperModule {}
