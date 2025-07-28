import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './common/logger/logger.service';
import { setupGlobalGuardrail } from './system/setup/guardrail';
import { ScoreModule } from './score/score.module';
import { LoggerModule } from './common/logger/logger.module';
import { PseudoAuthModule } from './pseudo-auth/pseudo-auth.module';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DbModule } from './system/database/db.module';
import { PrismaService } from './system/database/prisma.service';
import APP_PROVIDERS from './common/providers';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ClsModule.forRoot({
      plugins: [
        new ClsPluginTransactional({
          imports: [DbModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
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
