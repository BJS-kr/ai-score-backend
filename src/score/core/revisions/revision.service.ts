import { Injectable } from '@nestjs/common';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { MediaType, RevisionStatus } from '@prisma/client';
import { Processor } from 'src/score/helper/processor/processor';
import { RevisionRepository } from 'src/score/IO/respositories/revision.repository';
import { Transactional } from '@nestjs-cls/transactional';
import { LoggerService } from 'src/common/logger/logger.service';
import { ReviewResult, ReviewService } from '../reviews/review.service';

@Injectable()
export class RevisionService {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly submissionRepository: SubmissionRepository,
    private readonly revisionRepository: RevisionRepository,
    private readonly processor: Processor,
    private readonly logger: LoggerService,
  ) {}

  @Transactional()
  async reviseSubmission(
    logContext: LogContext,
  ): Promise<StrictReturn<ReviewResult>> {
    /**
     * 기존 submission 조회
     */
    const submission = await this.submissionRepository.getSubmission(
      logContext.logInfo.submissionId,
    );

    if (!submission) {
      return {
        success: false,
        error: 'Submission not found',
      };
    }

    /**
     * 새로운 revision 생성 및 submission 재시도 상태 업데이트
     */
    const revision = await this.revisionRepository.createRevision(logContext);

    await this.submissionRepository.updateSubmissionRetried(submission.id);

    /**
     * 최초 제출 했던 medias 조회
     */
    const submissionMediasResult = await this.getSubmissionMedias(
      submission.id,
    );

    if (!isSuccess(submissionMediasResult)) {
      await this.revisionRepository.updateRevision(
        revision.id,
        RevisionStatus.FAILED,
      );
      return submissionMediasResult;
    }

    const { videoSasUrl, audioSasUrl } = submissionMediasResult.data;

    this.processor.accumulateContextInfo(logContext, {
      videoSasUrl,
      audioSasUrl,
    });

    /**
     * 리뷰 요청
     */
    const { studentId, studentName } = submission;
    const reviewResult = await this.reviewService.review(
      submission.submitText,
      studentId,
      studentName,
      videoSasUrl,
      audioSasUrl,
      logContext,
    );

    /**
     * 최종 revision 상태 업데이트
     */
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
