import { Injectable } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';

@Injectable()
export class SubmissionsQueryService {
  constructor(private readonly submissionRepository: SubmissionRepository) {}

  async getSubmissions(pagination: Pagination, status?: SubmissionStatus) {
    return this.submissionRepository.getSubmissions(pagination, status);
  }

  async getSubmission(submissionId: string) {
    return this.submissionRepository.getSubmission(submissionId);
  }
}
