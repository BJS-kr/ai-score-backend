import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TxHost } from 'src/system/database/tx.host';

@Injectable()
export class ExternalCallLogRepository {
  constructor(private readonly writeClient: TxHost) {}

  createLog({
    traceId,
    context,
    success,
    latency,
    taskName,
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
    description?: string;
    requestData?: Prisma.NullableJsonNullValueInput;
    responseData?: Prisma.NullableJsonNullValueInput;
    errorMessage?: string;
  }) {
    return this.writeClient.tx.externalCallLog.create({
      data: {
        traceId,
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
