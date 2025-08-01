import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isSuccess,
  StrictReturn,
} from '../../../helper/processor/strict.return';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as ffprobeStatic from 'ffprobe-static';
import * as ffmpegStatic from 'ffmpeg-static';

export interface VideoProcessingRequest {
  inputFilePath: string;
  submissionId: string;
  outputDirectory?: string;
}

export interface VideoProcessingResponse {
  localVideoPath: string;
  localAudioPath: string;
  originalDuration: number;
  processedDuration: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
}

const MB = 1024 * 1024;

@Injectable()
export class FfmpegService implements OnModuleInit {
  private tempDirectory: string;
  private MAX_FILE_SIZE_MB: number;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!ffmpegStatic) {
      throw new Error('FFmpeg is not installed');
    }

    this.tempDirectory = this.configService.get<string>('TEMP_DIR') || './temp';
    this.MAX_FILE_SIZE_MB =
      (this.configService.get<number>('MAX_FILE_SIZE_MB') || 50) * MB;

    ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    ffmpeg.setFfprobePath(ffprobeStatic.path);

    this.ensureTempDirectoryExists();
  }

  async processVideo({
    inputFilePath,
    submissionId,
    outputDirectory,
  }: VideoProcessingRequest): Promise<StrictReturn<VideoProcessingResponse>> {
    const validationResult = await this.validateInputFile(inputFilePath);

    if (!isSuccess(validationResult)) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    const videoInfoResult = await this.getVideoInfo(inputFilePath);

    if (!isSuccess(videoInfoResult)) {
      return {
        success: false,
        error: videoInfoResult.error,
      };
    }

    const videoInfo = videoInfoResult.data;
    const outputDir = outputDirectory || this.tempDirectory;

    const processedVideoPath = path.join(
      outputDir,
      `${submissionId}_video.mp4`,
    );
    const extractedAudioPath = path.join(
      outputDir,
      `${submissionId}_audio.mp3`,
    );

    const videoProcessingResult = await this.removeRightSideImage(
      inputFilePath,
      processedVideoPath,
      videoInfo,
    );
    if (!videoProcessingResult.success) {
      return {
        success: false,
        error: videoProcessingResult.error,
      };
    }

    const audioExtractionResult = await this.extractAudio(
      inputFilePath,
      extractedAudioPath,
    );
    if (!audioExtractionResult.success) {
      return {
        success: false,
        error: audioExtractionResult.error,
      };
    }

    const processedVideoInfoResult =
      await this.getVideoInfo(processedVideoPath);
    if (!isSuccess(processedVideoInfoResult)) {
      return {
        success: false,
        error: processedVideoInfoResult.error,
      };
    }

    const processedVideoInfo = processedVideoInfoResult.data;

    return {
      success: true,
      data: {
        localVideoPath: processedVideoPath,
        localAudioPath: extractedAudioPath,
        originalDuration: videoInfo.duration,
        processedDuration: processedVideoInfo.duration,
      },
    };
  }

  async getVideoInfo(filePath: string): Promise<StrictReturn<VideoInfo>> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return resolve({
            success: false,
            error: `Failed to get video info: ${err}`,
          });
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video',
        );
        if (!videoStream) {
          return resolve({
            success: false,
            error: 'No video stream found in file',
          });
        }

        const videoInfo: VideoInfo = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          format: metadata.format.format_name || 'unknown',
          bitrate: parseInt(String(metadata.format.bit_rate || '0'), 10),
        };

        return resolve({
          success: true,
          data: videoInfo,
        });
      });
    });
  }

  private async removeRightSideImage(
    inputPath: string,
    outputPath: string,
    videoInfo: VideoInfo,
  ): Promise<StrictReturn<boolean>> {
    return new Promise((resolve) => {
      const cropWidth = Math.floor(videoInfo.width / 2);
      const cropStart = cropWidth;

      ffmpeg(inputPath)
        .videoFilter(`crop=${cropWidth}:${videoInfo.height}:${cropStart}:0`)
        .videoCodec('libx264')
        .outputOptions([
          '-preset fast',
          '-crf 23', // Good quality/size balance
          '-movflags +faststart', // Optimize for web streaming
          '-an',
        ])
        .output(outputPath)
        .on('end', () => {
          resolve({
            success: true,
            data: true,
          });
        })
        .on('error', (err) => {
          resolve({
            success: false,
            error: `Video processing failed: ${err.message}`,
          });
        })
        .run();
    });
  }

  private async extractAudio(
    inputPath: string,
    outputPath: string,
  ): Promise<StrictReturn<boolean>> {
    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioFrequency(44100)
        .output(outputPath)
        .on('end', () => {
          resolve({
            success: true,
            data: true,
          });
        })
        .on('error', (err) => {
          resolve({
            success: false,
            error: `Audio extraction failed: ${err.message}`,
          });
        })
        .run();
    });
  }

  private async validateInputFile(
    filePath: string,
  ): Promise<StrictReturn<null>> {
    if (!fsSync.existsSync(filePath)) {
      return {
        success: false,
        error: `Input file does not exist: ${filePath}`,
      };
    }

    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return {
        success: false,
        error: `Input path is not a file: ${filePath}`,
      };
    }

    const extension = path.extname(filePath);
    if (extension !== '.mp4') {
      return {
        success: false,
        error: `Input file is not a video file: ${filePath}`,
      };
    }

    const fileSize = stats.size;
    if (fileSize > this.MAX_FILE_SIZE_MB) {
      return {
        success: false,
        error: `File size (${Math.round(fileSize / MB)}MB) exceeds maximum allowed size (${this.MAX_FILE_SIZE_MB / MB}MB)`,
      };
    }

    return {
      success: true,
      data: null,
    };
  }

  private ensureTempDirectoryExists(): void {
    if (!fsSync.existsSync(this.tempDirectory)) {
      fsSync.mkdirSync(this.tempDirectory, { recursive: true });
    }
  }
}
