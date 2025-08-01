import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  BlobSASPermissions,
  BlockBlobClient,
} from '@azure/storage-blob';
import { readFile } from 'fs/promises';
import { StrictReturn } from '../../../helper/processor/strict.return';
import { MediaType } from '@prisma/client';
import { LoggerService } from 'src/common/logger/logger.service';
import { CONTEXT, ERROR_MESSAGE, TASK_NAME } from '../integration.constants';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { ExternalLogger } from 'src/score/helper/external-logger/external.logger';
import { NewSubmissionLogInfo } from 'src/common/decorators/param/log-context/log.variants';

export interface FileUploadResponse {
  videoFileUrl?: string;
  videoSasUrl?: string;
  videoFileSize?: number;
  audioFileUrl?: string;
  audioSasUrl?: string;
  audioFileSize?: number;
}

@Injectable()
export class AzureBlobStorageService implements OnModuleInit {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private accountName: string;
  private accountKey: string;
  private azureConnectionString: string;
  private sasUrlExpiresOnHours: number;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly externalLogger: ExternalLogger,
  ) {}

  onModuleInit() {
    this.accountKey = this.configService.get<string>('AZURE_ACCOUNT_KEY') || '';
    this.accountName =
      this.configService.get<string>('AZURE_ACCOUNT_NAME') || '';
    this.containerName =
      this.configService.get<string>('AZURE_CONTAINER') || '';
    this.azureConnectionString =
      this.configService.get<string>('AZURE_CONNECTION_STRING') || '';
    this.sasUrlExpiresOnHours = parseInt(
      this.configService.get<string>('AZURE_SAS_URL_EXPIRES_HOURS') || '24',
    );

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

  async uploadFile(
    filePath: string,
    mediaType: MediaType,
    logContext: LogContext<NewSubmissionLogInfo>,
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

      await this.externalLogger.logExternalCall(
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

    await this.externalLogger.logExternalCall(
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
      expiresOn: this.getSasUrlExpiresOn(this.sasUrlExpiresOnHours),
      permissions: BlobSASPermissions.parse('r'),
    });

    const fileUrl = blockBlobClient.url;

    return { sasUrl, fileUrl };
  }

  private getSasUrlExpiresOn(hours: number) {
    return new Date(Date.now() + 1000 * 60 * 60 * hours);
  }
}
