import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EVERY_MONTH } from './cron.expressions';
import { StatisticsRepository } from '../IO/respositories/statistics.repository';

export type Stats = {
  total: number;
  fails: number;
  completes: number;
};

@Injectable()
export class StatisticsService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStatistics() {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const dailyStats =
      await this.statisticsRepository.getStatsByFromDate(yesterday);
    await this.statisticsRepository.createDailyStats(dailyStats);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyStatistics() {
    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
    const stats =
      await this.statisticsRepository.getStatsByFromDate(sevenDaysAgo);
    await this.statisticsRepository.createWeeklyStats(stats);
  }

  @Cron(EVERY_MONTH)
  async handleMonthlyStatistics() {
    const now = new Date();
    const lastMonthFirstDay = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const stats =
      await this.statisticsRepository.getStatsByFromDate(lastMonthFirstDay);
    await this.statisticsRepository.createMonthlyStats(stats);
  }
}
