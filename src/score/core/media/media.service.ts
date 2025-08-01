import { Injectable } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import {
  LogContext,
  NewSubmissionLogInfo,
} from 'src/common/decorators/param/log-context/log.context';
import { FfmpegService } from 'src/score/IO/integrations/ffmpeg/ffmpeg.service';
import { AzureBlobStorageService } from 'src/score/IO/integrations/azure-blob-storage/azure-blob-storage.service';
import { Processor } from 'src/score/helper/processor/processor';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';

@Injectable()
export class MediaService {
  constructor(
    private readonly processor: Processor,
    private readonly ffmpegService: FfmpegService,
    private readonly azureBlobStorageService: AzureBlobStorageService,
    private readonly submissionRepository: SubmissionRepository,
  ) {}
  async processMedia(
    videoPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ): Promise<
    StrictReturn<{
      videoSasUrl: string;
      audioSasUrl: string;
    }>
  > {
    /**
     * process video using ffmpeg
     */
    const processedVideoResult = await this.processVideo(videoPath, logContext);

    if (!isSuccess(processedVideoResult)) {
      return processedVideoResult;
    }

    /**
     * Upload video to blob storage
     */
    const videoUploadResult = await this.uploadVideo(
      processedVideoResult.data.localVideoPath,
      logContext,
    );

    if (!isSuccess(videoUploadResult)) {
      return videoUploadResult;
    }

    /**
     * Upload audio to blob storage
     */
    const audioUploadResult = await this.uploadAudio(
      processedVideoResult.data.localAudioPath,
      logContext,
    );

    if (!isSuccess(audioUploadResult)) {
      return audioUploadResult;
    }

    return {
      success: true,
      data: {
        videoSasUrl: videoUploadResult.data.videoSasUrl!,
        audioSasUrl: audioUploadResult.data.audioSasUrl!,
      },
    };
  }

  private async processVideo(
    videoPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    return this.processor.process(
      await this.ffmpegService.processVideo({
        inputFilePath: videoPath,
        submissionId: logContext.logInfo.submissionId,
      }),
      logContext,
      ['localVideoPath', 'localAudioPath'],
      'video processing',
    );
  }

  private async uploadVideo(
    localVideoPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    const result = await this.processor.process(
      await this.azureBlobStorageService.uploadFile(
        localVideoPath,
        MediaType.VIDEO,
        logContext,
      ),
      logContext,
      ['videoFileUrl', 'videoSasUrl'],
      'video upload',
    );

    if (!isSuccess(result)) {
      return result;
    }

    await this.submissionRepository.createSubmissionMedia(
      logContext.logInfo.submissionId,
      MediaType.VIDEO,
      result.data.videoFileUrl!,
      result.data.videoSasUrl!,
      result.data.videoFileSize!,
    );

    return result;
  }

  private async uploadAudio(
    localAudioPath: string,
    logContext: LogContext<NewSubmissionLogInfo>,
  ) {
    const result = await this.processor.process(
      await this.azureBlobStorageService.uploadFile(
        localAudioPath,
        MediaType.AUDIO,
        logContext,
      ),
      logContext,
      ['audioFileUrl', 'audioSasUrl'],
      'audio upload',
    );

    if (!isSuccess(result)) {
      return result;
    }

    await this.submissionRepository.createSubmissionMedia(
      logContext.logInfo.submissionId,
      MediaType.AUDIO,
      result.data.audioFileUrl!,
      result.data.audioSasUrl!,
      result.data.audioFileSize!,
    );

    return result;
  }
}
