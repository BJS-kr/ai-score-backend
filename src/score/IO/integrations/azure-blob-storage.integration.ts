import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';
import { readFile } from 'fs/promises';
import { StrictReturn } from '../../helper/processor/strict.return';
import { ScoreRepository } from '../respositories/score.respository';
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
  private readonly azureConnectionString: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly scoreRepository: ScoreRepository,
  ) {
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

  async uploadFile(
    submissionId: string,
    filePath: string,
    mediaType: MediaType,
  ): Promise<StrictReturn<FileUploadResponse | null>> {
    const fileExtension = this.getFileExtension(filePath);
    const uniqueFileName = `${submissionId}/${mediaType}${fileExtension}`;
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists();

    const fileBuffer = await readFile(filePath);
    const fileSize = fileBuffer.length;

    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);
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

    const sasUrl = await blockBlobClient.generateSasUrl({
      // TODO: 설정 가능하게
      expiresOn: new Date(Date.now() + 1000 * 60 * 60 * 24),
      permissions: BlobSASPermissions.parse('r'),
    });

    const fileUrl = blockBlobClient.url;

    await this.scoreRepository.createMediaInfo(
      submissionId,
      mediaType,
      fileUrl,
      sasUrl,
      fileSize,
    );

    return {
      success: true,
      data:
        mediaType === MediaType.VIDEO
          ? {
              videoFileUrl: fileUrl,
              videoSasUrl: sasUrl,
            }
          : {
              audioFileUrl: fileUrl,
              audioSasUrl: sasUrl,
            },
    };
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  }
}
