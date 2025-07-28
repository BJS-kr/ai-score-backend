import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExternalCallLogRepository {
  constructor(
    private readonly writeClient: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  createLog({
    traceId,
    context,
    success,
    latency,
    taskName,
    submissionId,
    description,
    requestData,
    responseData,
    errorMessage,
  }: {
    traceId: string;
    context: string;
    success: boolean;
    latency: number;
    taskName: string;
    submissionId: string;
    description?: string;
    requestData?: Prisma.NullableJsonNullValueInput;
    responseData?: Prisma.NullableJsonNullValueInput;
    errorMessage?: string;
  }) {
    return this.writeClient.tx.submissionExternalCallLog.upsert({
      where: { traceId },
      update: {
        submissionId,
        context,
        success,
        latency,
        taskName,
        description,
        requestData,
        responseData,
        errorMessage,
      },
      create: {
        traceId,
        submissionId,
        context,
        success,
        latency,
        taskName,
        description,
        requestData,
        responseData,
        errorMessage,
      },
    });
  }
}
