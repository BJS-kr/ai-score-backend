import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EVERY_MONTH } from './cron.expressions';
import { StatisticsRepository } from '../IO/respositories/statistics.repository';
import { LoggerService } from 'src/common/logger/logger.service';
import { trace } from '@opentelemetry/api';

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
    trace
      .getTracer('StatisticsService')
      .startActiveSpan('handleDailyStatistics', async (span) => {
        const yesterday = this.getDaysAgo(1);
        const dailyStats =
          await this.statisticsRepository.getStatsByFromDate(yesterday);
        const stat =
          await this.statisticsRepository.createDailyStats(dailyStats);
        this.logger.info(
          `Daily statistics: ${JSON.stringify(stat)}`,
          'StatisticsService',
        );

        span.end();
      });
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyStatistics() {
    trace
      .getTracer('StatisticsService')
      .startActiveSpan('handleWeeklyStatistics', async (span) => {
        const sevenDaysAgo = this.getDaysAgo(7);
        const stats =
          await this.statisticsRepository.getStatsByFromDate(sevenDaysAgo);
        const stat = await this.statisticsRepository.createWeeklyStats(stats);
        this.logger.info(
          `Weekly statistics: ${JSON.stringify(stat)}`,
          'StatisticsService',
        );

        span.end();
      });
  }

  @Cron(EVERY_MONTH)
  async handleMonthlyStatistics() {
    trace
      .getTracer('StatisticsService')
      .startActiveSpan('handleMonthlyStatistics', async (span) => {
        const lastMonthFirstDay = this.getLastMonthFirstDay();
        const stats =
          await this.statisticsRepository.getStatsByFromDate(lastMonthFirstDay);
        const stat = await this.statisticsRepository.createMonthlyStats(stats);
        this.logger.info(
          `Monthly statistics: ${JSON.stringify(stat)}`,
          'StatisticsService',
        );

        span.end();
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
