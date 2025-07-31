import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { RevisionStatus } from '@prisma/client';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { Pagination } from 'src/common/decorators/param/pagination/pagination';
import { PrismaService } from 'src/system/database/prisma.service';

@Injectable()
export class RevisionRepository {
  constructor(
    private readonly writeClient: TransactionHost<TransactionalAdapterPrisma>,
    private readonly readClient: PrismaService,
  ) {}

  async createRevision(logContext: LogContext) {
    await this.writeClient.tx.submissionLog.create({
      data: {
        traceId: logContext.traceId,
        requestUri: 'revision',
        submissionId: logContext.logInfo.submissionId,
      },
    });

    return this.writeClient.tx.revision.create({
      data: { submissionId: logContext.logInfo.submissionId },
    });
  }

  async updateRevision(revisionId: string, status: RevisionStatus) {
    return this.writeClient.tx.revision.update({
      where: { id: revisionId },
      data: { status },
    });
  }

  async getRevisions(pagination: Pagination) {
    const total = await this.readClient.revision.count();
    const revisions = await this.readClient.revision.findMany({
      ...pagination,
    });

    return {
      total,
      revisions,
    };
  }

  async getRevision(revisionId: string) {
    return this.readClient.revision.findUnique({
      where: { id: revisionId },
    });
  }
}
