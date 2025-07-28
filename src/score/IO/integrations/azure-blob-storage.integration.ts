import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';
import { readFile } from 'fs/promises';
import { StrictReturn } from '../../helper/processor/strict.return';
import { ScoreRepository } from '../respositories/score.respository';
import { MediaType } from '@prisma/client';

export interface FileUploadResponse {
  videoFileUrl?: string;
  videoSasUrl?: string;
  audioFileUrl?: string;
  audioSasUrl?: string;
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
    private readonly scoreRepository: ScoreRepository,
  ) {}

  async uploadFile(
    submissionId: string,
    filePath: string,
    mediaType: MediaType,
  ): Promise<StrictReturn<FileUploadResponse | null>> {
    const uniqueFileName = this.generateFileName(
      filePath,
      submissionId,
      mediaType,
    );
    const containerClient = await this.getContainerClient();
    const { fileBuffer, fileSize } = await this.getFileBufferAndSize(filePath);
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);

    //4
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

    if (uploadResponse.errorCode) {
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
