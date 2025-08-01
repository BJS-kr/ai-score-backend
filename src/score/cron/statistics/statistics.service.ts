import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EVERY_MONTH } from '../constants/cron.expressions';
import { StatisticsRepository } from '../../IO/respositories/statistics.repository';
import { LoggerService } from 'src/common/logger/logger.service';
import { traced } from 'src/system/telemetry/traced';

export type Stats = {
  total: number;
  fails: number;
  completes: number;
};
@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly logger: LoggerService,
  ) {}
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStatistics() {
    await traced('StatisticsService', 'handleDailyStatistics', async () => {
      const yesterday = this.getDaysAgo(1);
      const dailyStats =
        await this.statisticsRepository.getStatsByFromDate(yesterday);
      const stat = await this.statisticsRepository.createDailyStats(dailyStats);
      this.logger.info(
        `Daily statistics: ${JSON.stringify(stat)}`,
        'StatisticsService',
      );

      return stat;
    });
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyStatistics() {
    await traced('StatisticsService', 'handleWeeklyStatistics', async () => {
      const sevenDaysAgo = this.getDaysAgo(7);
      const stats =
        await this.statisticsRepository.getStatsByFromDate(sevenDaysAgo);
      const stat = await this.statisticsRepository.createWeeklyStats(stats);
      this.logger.info(
        `Weekly statistics: ${JSON.stringify(stat)}`,
        'StatisticsService',
      );

      return stat;
    });
  }

  @Cron(EVERY_MONTH)
  async handleMonthlyStatistics() {
    await traced('StatisticsService', 'handleMonthlyStatistics', async () => {
      const lastMonthFirstDay = this.getLastMonthFirstDay();
      const stats =
        await this.statisticsRepository.getStatsByFromDate(lastMonthFirstDay);
      const stat = await this.statisticsRepository.createMonthlyStats(stats);
      this.logger.info(
        `Monthly statistics: ${JSON.stringify(stat)}`,
        'StatisticsService',
      );

      return stat;
    });
  }

  private getLastMonthFirstDay() {
    const d = new Date();

    d.setUTCMonth(d.getUTCMonth() - 1);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);

    return d;
  }

  private getDaysAgo(days: number) {
    const d = new Date();

    d.setUTCDate(d.getUTCDate() - days);
    d.setUTCHours(0, 0, 0, 0);

    return d;
  }
}
