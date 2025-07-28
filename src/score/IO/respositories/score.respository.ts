import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/system/database/prisma.service';
import { SubmissionRequestDto } from '../../router/dto/request/submission.request.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  MediaType,
  SubmissionLogStatus,
  SubmissionStatus,
} from '@prisma/client';
import { SubmissionLogInfo } from 'src/score/core/submission/submissions.review.service';
import { LogContext } from 'src/common/decorators/param/log.context';
import { TxHost } from 'src/system/database/tx.host';

export interface EssayEvaluation {
  score: number;
  feedback: string;
  highlights: string[];
}

@Injectable()
export class ScoreRepository {
  constructor(
    private readonly readClient: PrismaService,
    private readonly writeClient: TxHost,
  ) {}

  async createSubmission(
    dto: SubmissionRequestDto,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    const submissionId = await this.writeClient.tx.submission
      .create({
        select: {
          id: true,
        },
        data: {
          id: uuidv4(),
          studentId: dto.studentId,
          componentType: dto.componentType,
          submitText: dto.submitText,
        },
      })
      .then(({ id }) => id);

    await this.writeClient.tx.submissionLog.create({
      data: {
        traceId: logContext.traceId,
        submissionId,
        status: SubmissionLogStatus.PENDING,
        requestUri: logContext.requestUri,
      },
    });

    return submissionId;
  }

  async completeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    highlights: string[],
    logContext: LogContext<SubmissionLogInfo>,
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

  createMediaInfo(
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
}
