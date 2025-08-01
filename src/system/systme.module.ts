import { Global, Module } from '@nestjs/common';
import { DbModule } from './database/db.module';
import { GlobalGuardrail } from './setup/guardrail';
import { ExceptionAlert } from './alert/exception.alert';

@Global()
@Module({
  imports: [DbModule],
  providers: [GlobalGuardrail, ExceptionAlert],
  exports: [GlobalGuardrail, ExceptionAlert],
})
export class SystemModule {}
