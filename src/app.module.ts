import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './common/logger/logger.service';
import { setupGlobalGuardrail } from './system/setup/guardrail';
import { APP_PROVIDERS } from './common/providers';
import { ScoreModule } from './score/score.module';
import { LoggerModule } from './common/logger/logger.module';
import { PseudoAuthModule } from './pseudo-auth/pseudo-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScoreModule,
    LoggerModule,
    PseudoAuthModule,
  ],
  providers: [...APP_PROVIDERS],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}

  onModuleInit() {
    setupGlobalGuardrail(this.logger);
  }
}
