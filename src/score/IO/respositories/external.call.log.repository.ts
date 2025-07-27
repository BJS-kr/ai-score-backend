import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/system/database/prisma.service';

@Injectable()
export class ExternalCallLogRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.externalCallLog.create({
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
