import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
  ContainerClient,
} from '@azure/storage-blob';
import { readFile } from 'fs/promises';
import { StrictReturn } from '../../../internal/stricter/strict.return';
import { ScoreRepository } from '../respositories/score.respository';
import { LoggerService } from 'src/common/logger/logger.service';
import { MediaType } from '@prisma/client';

export interface GenerateSasUrlRequest {
  fileName: string;
  expiresInHours: number;
}

export interface FileUploadResponse {
  videoFileUrl?: string;
  videoSasUrl?: string;
  audioFileUrl?: string;
  audioSasUrl?: string;
}

@Injectable()
export class AzureBlobStorageIntegration {
  private readonly blobServiceClient: BlobServiceClient;
  private readonly containerName: string;
  private readonly accountName: string;
  private readonly accountKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly scoreRepository: ScoreRepository,
  ) {
    this.accountName =
      this.configService.get<string>('AZURE_ACCOUNT_NAME') || '';
    this.accountKey = this.configService.get<string>('AZURE_ACCOUNT_KEY') || '';
    this.containerName =
      this.configService.get<string>('AZURE_CONTAINER') || '';

    if (!this.accountName || !this.accountKey || !this.containerName) {
      throw new Error('Azure Blob Storage configuration is missing');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey,
    );
    this.blobServiceClient = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      sharedKeyCredential,
    );
  }

  async uploadFile(
    submissionId: string,
    filePath: string,
    mediaType: MediaType,
  ): Promise<StrictReturn<FileUploadResponse | null>> {
    const fileExtension = this.getFileExtension(filePath);
    const uniqueFileName = `${submissionId}/${mediaType}.${fileExtension}`;
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const containerResult = await this.ensureContainerExists(containerClient);

    if (!containerResult.success) {
      return {
        success: false,
        error: containerResult.error,
        data: null,
      };
    }

    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);

    const fileBuffer = await readFile(filePath);
    const fileSize = fileBuffer.length;
    const uploadResponse = await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: {
        blobContentType:
          mediaType === MediaType.VIDEO ? 'video/mp4' : 'audio/mp3',
      },
      metadata: {
        submissionId,
        mediaType,
        uploadedAt: new Date().toISOString(),
      },
    });

    if (!uploadResponse.requestId) {
      return {
        success: false,
        error: 'File upload failed - no request ID received',
        data: null,
      };
    }

    const fileUrl = blockBlobClient.url;
    const sasUrlResult = await this.generateSasUrl({
      fileName: uniqueFileName,
      expiresInHours: 24,
    });

    if (!sasUrlResult.success || !sasUrlResult.data) {
      return {
        success: false,
        error: sasUrlResult.error,
        data: null,
      };
    }

    await this.scoreRepository.createMediaInfo(
      submissionId,
      mediaType,
      fileUrl,
      sasUrlResult.data,
      fileSize,
    );

    return {
      success: true,
      data:
        mediaType === MediaType.VIDEO
          ? {
              videoFileUrl: fileUrl,
              videoSasUrl: sasUrlResult.data,
            }
          : {
              audioFileUrl: fileUrl,
              audioSasUrl: sasUrlResult.data,
            },
    };
  }

  private async generateSasUrl(
    request: GenerateSasUrlRequest,
  ): Promise<StrictReturn<string | null>> {
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + request.expiresInHours);

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey,
    );

    const sasOptions = {
      containerName: this.containerName,
      blobName: request.fileName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
    };

    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      sharedKeyCredential,
    ).toString();
    const sasUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${request.fileName}?${sasToken}`;

    return {
      success: true,
      data: sasUrl,
    };
  }

  private async ensureContainerExists(
    containerClient: ContainerClient,
  ): Promise<StrictReturn<boolean>> {
    const response = await containerClient.createIfNotExists({
      access: 'blob',
    });

    if (!response.succeeded) {
      return {
        success: false,
        error: `failed to create container: ${response.errorCode}`,
        data: false,
      };
    }

    return {
      success: true,
      data: true,
    };
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  }
}
