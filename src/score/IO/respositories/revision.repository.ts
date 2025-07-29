import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { RevisionStatus } from '@prisma/client';
import { Pagination } from 'src/common/decorators/param/pagination';
import { PrismaService } from 'src/system/database/prisma.service';

@Injectable()
export class RevisionRepository {
  constructor(
    private readonly writeClient: TransactionHost<TransactionalAdapterPrisma>,
    private readonly readClient: PrismaService,
  ) {}

  async createRevision(submissionId: string) {
    await this.writeClient.tx.submission.update({
      where: { id: submissionId },
      data: { retried: true },
    });

    return this.writeClient.tx.revision.create({
      data: { submissionId },
    });
  }

  async updateRevision(revisionId: string, status: RevisionStatus) {
    return this.writeClient.tx.revision.update({
      where: { id: revisionId },
      data: { status },
    });
  }

  async getRevisions(pagination: Pagination) {
    return this.readClient.revision.findMany({
      ...pagination,
    });
  }

  async getRevision(revisionId: string) {
    return this.readClient.revision.findUnique({
      where: { id: revisionId },
    });
  }
}
