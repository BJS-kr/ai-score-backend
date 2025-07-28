import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  BlobSASPermissions,
  BlockBlobClient,
} from '@azure/storage-blob';
import { readFile } from 'fs/promises';
import { StrictReturn } from '../../helper/processor/strict.return';
import { MediaType } from '@prisma/client';
import { LoggerService } from 'src/common/logger/logger.service';
import { CONTEXT, ERROR_MESSAGE, TASK_NAME } from './constant';
import { LogContext } from 'src/common/decorators/param/log.context';
import { SubmissionLogInfo } from 'src/score/core/submission/review.service';
import { ExternalCallLogRepository } from '../respositories/external.call.log.repository';

export interface FileUploadResponse {
  videoFileUrl?: string;
  videoSasUrl?: string;
  videoFileSize?: number;
  audioFileUrl?: string;
  audioSasUrl?: string;
  audioFileSize?: number;
}

@Injectable()
export class AzureBlobStorageIntegration implements OnModuleInit {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private accountName: string;
  private accountKey: string;
  private azureConnectionString: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly externalCallLogRepository: ExternalCallLogRepository,
  ) {}

  async uploadFile(
    filePath: string,
    mediaType: MediaType,
    logContext: LogContext<SubmissionLogInfo>,
  ): Promise<StrictReturn<FileUploadResponse>> {
    const uniqueFileName = this.generateFileName(
      filePath,
      logContext.logInfo.submissionId,
      mediaType,
    );
    const containerClient = await this.getContainerClient();
    const { fileBuffer, fileSize } = await this.getFileBufferAndSize(filePath);
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);

    this.logger.trace(
      'Uploaded file to Azure Blob Storage',
      CONTEXT.AZURE_BLOB_STORAGE,
      {
        submissionId: logContext.logInfo.submissionId,
        mediaType,
        uniqueFileName,
        fileSize,
      },
    );
    const startTime = Date.now();
    const uploadResponse = await this.upload(
      fileBuffer,
      mediaType,
      logContext.logInfo.submissionId,
      blockBlobClient,
    );
    const latency = Date.now() - startTime;

    if (uploadResponse.errorCode) {
      const errorMessage =
        ERROR_MESSAGE.AZURE_BLOB_STORAGE.ERROR_CODE_RECEIVED.replace(
          '$1',
          uploadResponse.errorCode,
        );

      await this.logExternalCall(
        logContext,
        latency,
        false,
        CONTEXT.AZURE_BLOB_STORAGE,
        TASK_NAME.AZURE_BLOB_STORAGE_UPLOAD,
        errorMessage,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }

    const { sasUrl, fileUrl } = await this.getUrls(blockBlobClient);

    await this.logExternalCall(
      logContext,
      latency,
      true,
      CONTEXT.AZURE_BLOB_STORAGE,
      TASK_NAME.AZURE_BLOB_STORAGE_UPLOAD,
      'File upload successful',
    );

    return {
      success: true,
      data:
        mediaType === MediaType.VIDEO
          ? {
              videoFileUrl: fileUrl,
              videoSasUrl: sasUrl,
              videoFileSize: fileSize,
            }
          : {
              audioFileUrl: fileUrl,
              audioSasUrl: sasUrl,
              audioFileSize: fileSize,
            },
    };
  }

  private upload(
    fileBuffer: Buffer,
    mediaType: MediaType,
    submissionId: string,
    blockBlobClient: BlockBlobClient,
  ) {
    const blobContentType =
      mediaType === MediaType.VIDEO ? 'video/mp4' : 'audio/mp3';
    return blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: {
        blobContentType,
      },
      metadata: {
        submissionId,
        mediaType,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  private generateFileName(
    filePath: string,
    submissionId: string,
    mediaType: MediaType,
  ) {
    const fileExtension = this.getFileExtension(filePath);
    return `${submissionId}/${mediaType}${fileExtension}`;
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  }

  private async getContainerClient() {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists();

    return containerClient;
  }

  private async getFileBufferAndSize(filePath: string) {
    const fileBuffer = await readFile(filePath);
    const fileSize = fileBuffer.length;
    return { fileBuffer, fileSize };
  }

  private async getUrls(blockBlobClient: BlockBlobClient) {
    const sasUrl = await blockBlobClient.generateSasUrl({
      // TODO: 설정 가능하게
      expiresOn: new Date(Date.now() + 1000 * 60 * 60 * 24),
      permissions: BlobSASPermissions.parse('r'),
    });

    const fileUrl = blockBlobClient.url;

    return { sasUrl, fileUrl };
  }

  private logExternalCall(
    logContext: LogContext<SubmissionLogInfo>,
    latency: number,
    success: boolean,
    context: string,
    taskName: string,
    description: string,
  ) {
    this.logger.trace(description, context);
    return this.externalCallLogRepository.createLog({
      traceId: logContext.traceId,
      submissionId: logContext.logInfo.submissionId,
      context,
      success,
      latency,
      taskName,
      description,
    });
  }

  onModuleInit() {
    this.accountKey = this.configService.get<string>('AZURE_ACCOUNT_KEY') || '';
    this.accountName =
      this.configService.get<string>('AZURE_ACCOUNT_NAME') || '';
    this.containerName =
      this.configService.get<string>('AZURE_CONTAINER') || '';
    this.azureConnectionString =
      this.configService.get<string>('AZURE_CONNECTION_STRING') || '';

    if (
      !this.accountName ||
      !this.accountKey ||
      !this.containerName ||
      !this.azureConnectionString
    ) {
      throw new Error('Azure Blob Storage configuration is missing');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.azureConnectionString,
    );
  }
}
