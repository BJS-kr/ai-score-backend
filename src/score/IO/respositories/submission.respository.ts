import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/system/database/prisma.service';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  MediaType,
  SubmissionLogStatus,
  SubmissionStatus,
} from '@prisma/client';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log.context';
import { Pagination } from 'src/common/decorators/param/pagination';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

export interface EssayEvaluation {
  score: number;
  feedback: string;
  highlights: string[];
}

@Injectable()
export class SubmissionRepository {
  constructor(
    private readonly readClient: PrismaService,
    private readonly writeClient: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async createSubmission(
    dto: SubmissionRequestDto,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    const submissionId = await this.writeClient.tx.submission
      .create({
        select: {
          id: true,
        },
        data: {
          id: uuidv4(),
          studentId: dto.studentId,
          studentName: dto.studentName,
          componentType: dto.componentType,
          submitText: dto.submitText,
        },
      })
      .then(({ id }) => id);

    await this.writeClient.tx.submissionLog.create({
      data: {
        traceId: logContext.traceId,
        submissionId,
        requestUri: logContext.requestUri,
      },
    });

    return submissionId;
  }

  async getSubmissions(pagination: Pagination, status?: SubmissionStatus) {
    const total = await this.readClient.submission.count({
      where: {
        status,
      },
    });

    const submissions = await this.readClient.submission.findMany({
      ...pagination,
      where: {
        status,
      },
    });

    return {
      total,
      submissions,
    };
  }

  async getSubmission(submissionId: string) {
    return this.readClient.submission.findUnique({
      where: { id: submissionId },
    });
  }

  async getFailedAndNotRetriedSubmissions() {
    return this.readClient.submission.findMany({
      where: {
        status: SubmissionStatus.FAILED,
        retried: false,
      },
    });
  }

  async completeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    highlights: string[],
    logContext: LogContext,
  ) {
    await this.writeClient.tx.submission.update({
      where: { id: submissionId },
      data: {
        score,
        status: SubmissionStatus.COMPLETED,
        feedback,
        highlights,
      },
    });

    await this.writeClient.tx.submissionLog.update({
      where: { traceId: logContext.traceId },
      data: {
        status: SubmissionLogStatus.COMPLETED,
        ...logContext.logInfo,
        latency: Date.now() - logContext.startTime,
      },
    });
  }

  checkAlreadySubmitted(studentId: string, componentType: string) {
    return this.readClient.submission.findFirst({
      select: {
        id: true,
      },
      where: {
        studentId,
        componentType,
      },
    });
  }

  async failSubmission(
    submissionId: string,
    traceId: string,
    startTime: number,
    externalError: string,
  ) {
    await this.writeClient.tx.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.FAILED },
    });

    await this.writeClient.tx.submissionLog.update({
      where: { traceId },
      data: {
        status: SubmissionLogStatus.FAILED,
        errorMessage: externalError,
        latency: Date.now() - startTime,
      },
    });
  }

  createSubmissionMedia(
    submissionId: string,
    mediaType: MediaType,
    fileUrl: string,
    sasUrl: string,
    fileSize: number,
  ) {
    return this.writeClient.tx.submissionMedia.create({
      data: {
        id: uuidv4(),
        submissionId,
        mediaType,
        fileUrl,
        sasUrl,
        fileSize,
      },
    });
  }

  getSubmissionMedia(submissionId: string, mediaType: MediaType) {
    return this.readClient.submissionMedia.findFirst({
      where: { submissionId, mediaType },
    });
  }

  updateSubmissionRetried(submissionId: string) {
    return this.writeClient.tx.submission.update({
      where: { id: submissionId },
      data: { retried: true },
    });
  }
}
