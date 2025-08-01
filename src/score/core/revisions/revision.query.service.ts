import { Injectable } from '@nestjs/common';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { RevisionRepository } from 'src/score/IO/respositories/revision.repository';
/**
 * Revision 조회용 서비스
 */
@Injectable()
export class RevisionQueryService {
  constructor(private readonly revisionRepository: RevisionRepository) {}

  async getRevisions(pagination: Pagination) {
    return this.revisionRepository.getRevisions(pagination);
  }

  async getRevision(revisionId: string) {
    return this.revisionRepository.getRevision(revisionId);
  }
}
