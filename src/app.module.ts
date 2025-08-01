import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScoreModule } from './score/score.module';
import { LoggerModule } from './common/logger/logger.module';
import { PseudoAuthModule } from './pseudo-auth/pseudo-auth.module';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DbModule } from './system/database/db.module';
import { PrismaService } from './system/database/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import APP_PROVIDERS from './common/providers';
import { SystemModule } from './system/systme.module';
import { CONFIG_KEY } from './score/cron/constants/config.key';
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

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        configKey: CONFIG_KEY,
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379'),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    ScoreModule,
    LoggerModule,
    PseudoAuthModule,
    SystemModule,
  ],
  providers: [...APP_PROVIDERS],
})
export class AppModule {}
