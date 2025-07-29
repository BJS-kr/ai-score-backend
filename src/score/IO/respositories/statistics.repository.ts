import { Injectable } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { Stats } from 'src/score/cron/statistics.service';
import { PrismaService } from 'src/system/database/prisma.service';

@Injectable()
export class StatisticsRepository {
  constructor(private readonly readClient: PrismaService) {}
  createDailyStats({ total, fails, completes }: Stats) {
    return this.readClient.statsDaily.create({
      data: {
        totalSubmissions: total,
        successfulSubmissions: completes,
        failedSubmissions: fails,
      },
    });
  }

  createWeeklyStats({ total, fails, completes }: Stats) {
    return this.readClient.statsWeekly.create({
      data: {
        totalSubmissions: total,
        successfulSubmissions: completes,
        failedSubmissions: fails,
      },
    });
  }

  createMonthlyStats({ total, fails, completes }: Stats) {
    return this.readClient.statsMonthly.create({
      data: {
        totalSubmissions: total,
        successfulSubmissions: completes,
        failedSubmissions: fails,
      },
    });
  }

  async getStatsByFromDate(fromDate: Date): Promise<Stats> {
    const total = await this.readClient.submission.count({
      where: {
        createdAt: { gte: fromDate, lte: new Date() },
      },
    });

    const fails = await this.readClient.submission.count({
      where: {
        createdAt: { gte: fromDate, lte: new Date() },
        status: SubmissionStatus.FAILED,
      },
    });

    const completes = await this.readClient.submission.count({
      where: {
        createdAt: { gte: fromDate, lte: new Date() },
        status: SubmissionStatus.COMPLETED,
      },
    });

    return { total, fails, completes };
  }
}
