import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/system/database/prisma.service';
import { SubmissionRequestDto } from '../../router/submissions/dto/request/submission.request.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  MediaType,
  SubmissionLogStatus,
  SubmissionStatus,
} from '@prisma/client';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { NewSubmissionLogInfo } from 'src/common/decorators/param/log-context/log.variants';
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
          submissionLogs: {
            create: {
              traceId: logContext.traceId,
              requestUri: logContext.requestUri,
            },
          },
        },
      })
      .then(({ id }) => id);

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
    score: number,
    feedback: string,
    highlights: string[],
    logContext: LogContext,
  ) {
    const { submissionId, ...submissionLogInfo } = logContext.logInfo;

    await this.writeClient.tx.submission.update({
      where: { id: submissionId },
      data: {
        score,
        status: SubmissionStatus.COMPLETED,
        feedback,
        highlights,
        submissionLogs: {
          update: {
            where: {
              traceId: logContext.traceId,
            },
            data: {
              status: SubmissionLogStatus.COMPLETED,
              ...submissionLogInfo,
              latency: Date.now() - logContext.startTime,
            },
          },
        },
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
      data: {
        status: SubmissionStatus.FAILED,
        submissionLogs: {
          update: {
            where: { traceId },
            data: {
              status: SubmissionLogStatus.FAILED,
              errorMessage: externalError,
              latency: Date.now() - startTime,
            },
          },
        },
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
