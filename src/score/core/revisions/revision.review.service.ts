import { Injectable } from '@nestjs/common';
import { SubmissionsReviewService } from '../submissions/submissions.review.service';
import { LogContext } from 'src/common/decorators/param/log.context';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionResult } from '../submissions/interfaces/submission.result';
import { MediaType, RevisionStatus } from '@prisma/client';
import { Processor } from 'src/score/helper/processor/processor';
import { RevisionRepository } from 'src/score/IO/respositories/revision.repository';
import { Transactional } from '@nestjs-cls/transactional';

// TODO: 로그 추가
@Injectable()
export class RevisionReviewService {
  constructor(
    private readonly submissionReviewService: SubmissionsReviewService,
    private readonly submissionRepository: SubmissionRepository,
    private readonly revisionRepository: RevisionRepository,
    private readonly processor: Processor,
  ) {}

  @Transactional()
  async reviseSubmission(
    logContext: LogContext,
  ): Promise<StrictReturn<SubmissionResult>> {
    const submission = await this.submissionRepository.getSubmission(
      logContext.logInfo.submissionId,
    );

    if (!submission) {
      return {
        success: false,
        error: 'Submission not found',
      };
    }

    const revision = await this.revisionRepository.createRevision(
      submission.id,
    );

    const submissionMediasResult = await this.getSubmissionMedias(
      submission.id,
    );

    if (!isSuccess(submissionMediasResult)) {
      return submissionMediasResult;
    }

    const { videoSasUrl, audioSasUrl } = submissionMediasResult.data;

    this.processor.accumulateContextInfo(logContext, {
      videoSasUrl,
      audioSasUrl,
    });

    const reviewResult = await this.submissionReviewService.submitForReview(
      submission.submitText,
      logContext,
      videoSasUrl,
      audioSasUrl,
    );

    if (!isSuccess(reviewResult)) {
      await this.revisionRepository.updateRevision(
        revision.id,
        RevisionStatus.FAILED,
      );
      return reviewResult;
    }

    await this.revisionRepository.updateRevision(
      revision.id,
      RevisionStatus.COMPLETED,
    );
    return reviewResult;
  }

  private async getSubmissionMedias(submissionId: string): Promise<
    StrictReturn<{
      videoSasUrl: string;
      audioSasUrl: string;
    }>
  > {
    const videoMedia = await this.submissionRepository.getSubmissionMedia(
      submissionId,
      MediaType.VIDEO,
    );

    if (!videoMedia) {
      return {
        success: false,
        error: 'Video media not found',
      };
    }

    const audioMedia = await this.submissionRepository.getSubmissionMedia(
      submissionId,
      MediaType.AUDIO,
    );

    if (!audioMedia) {
      return {
        success: false,
        error: 'Audio media not found',
      };
    }

    return {
      success: true,
      data: {
        videoSasUrl: videoMedia.sasUrl,
        audioSasUrl: audioMedia.sasUrl,
      },
    };
  }
}
