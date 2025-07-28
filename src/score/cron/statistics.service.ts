import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EVERY_MONTH } from './cron.expressions';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class StatisticsService {
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStatistics() {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyStatistics() {}

  @Cron(EVERY_MONTH)
  async handleMonthlyStatistics() {}
}
