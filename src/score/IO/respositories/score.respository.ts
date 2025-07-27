import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/system/database/prisma.service';
import { SubmissionRequestDto } from '../../router/dto/request/submission.request.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  MediaType,
  SubmissionLogStatus,
  SubmissionStatus,
} from '@prisma/client';
import { SubmissionLogInfo } from 'src/score/core/submission/review.service';
import { LogContext } from 'src/common/decorators/param/log.context';

export interface EssayEvaluation {
  score: number;
  feedback: string;
  highlights: string[];
}

@Injectable()
export class ScoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSubmission(
    dto: SubmissionRequestDto,
    logContext: LogContext<SubmissionLogInfo>,
  ) {
    const submissionId = await this.prisma.submission
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

    await this.prisma.submissionLog.create({
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
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score,
        status: SubmissionStatus.COMPLETED,
        feedback,
        highlights,
      },
    });

    await this.prisma.submissionLog.update({
      where: { traceId: logContext.traceId },
      data: {
        status: SubmissionLogStatus.COMPLETED,
        ...logContext.logInfo,
        latency: Date.now() - logContext.startTime,
      },
    });
  }

  checkAlreadySubmitted(studentId: string, componentType: string) {
    return this.prisma.submission.findFirst({
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
    logContext: LogContext<SubmissionLogInfo>,
    externalError: string,
  ) {
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.FAILED },
    });

    await this.prisma.submissionLog.update({
      where: { traceId: logContext.traceId },
      data: {
        status: SubmissionLogStatus.FAILED,
        errorMessage: externalError,
        latency: Date.now() - logContext.startTime,
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
    return this.prisma.submissionMedia.create({
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
