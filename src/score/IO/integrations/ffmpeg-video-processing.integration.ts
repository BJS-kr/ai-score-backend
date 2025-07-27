import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as ffprobeStatic from 'ffprobe-static';
import { StrictReturn } from '../../../internal/stricter/strict.return';
const ffmpegStatic = require('ffmpeg-static');

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
export class VideoService {
  private readonly tempDirectory: string;
  private readonly MAX_FILE_SIZE_MB: number;

  constructor(private readonly configService: ConfigService) {
    this.tempDirectory =
      this.configService.get<string>('video.tempDirectory') || './temp';
    // TODO: move to env
    this.MAX_FILE_SIZE_MB =
      (this.configService.get<number>('video.maxFileSizeMB') || 500) * MB;

    ffmpeg.setFfmpegPath(ffmpegStatic);
    ffmpeg.setFfprobePath(ffprobeStatic.path);

    this.ensureTempDirectoryExists();
  }

  async processVideo({
    inputFilePath,
    submissionId,
    outputDirectory,
  }: VideoProcessingRequest): Promise<
    StrictReturn<VideoProcessingResponse | null>
  > {
    try {
      const validationResult = await this.validateInputFile(inputFilePath);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          data: null,
        };
      }

      const videoInfoResult = await this.getVideoInfo(inputFilePath);
      if (!videoInfoResult.success || !videoInfoResult.data) {
        return {
          success: false,
          error: videoInfoResult.error,
          data: null,
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
          data: null,
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
          data: null,
        };
      }

      const processedVideoInfoResult =
        await this.getVideoInfo(processedVideoPath);
      if (!processedVideoInfoResult.success || !processedVideoInfoResult.data) {
        return {
          success: false,
          error: processedVideoInfoResult.error,
          data: null,
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `FFmpeg video processing error: ${errorMessage}`,
        data: null,
      };
    }
  }

  async getVideoInfo(
    filePath: string,
  ): Promise<StrictReturn<VideoInfo | null>> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return resolve({
            success: false,
            error: `Failed to get video info: ${err.message}`,
            data: null,
          });
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video',
        );
        if (!videoStream) {
          return resolve({
            success: false,
            error: 'No video stream found in file',
            data: null,
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
            data: false,
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
            data: false,
          });
        })
        .run();
    });
  }

  async cleanupFile(filePath: string): Promise<StrictReturn<boolean>> {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);

      return {
        success: true,
        data: true,
      };
    }

    return {
      success: true,
      data: false,
    };
  }

  private async validateInputFile(
    filePath: string,
  ): Promise<StrictReturn<boolean>> {
    try {
      if (!fsSync.existsSync(filePath)) {
        return {
          success: false,
          error: `Input file does not exist: ${filePath}`,
          data: false,
        };
      }

      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: `Input path is not a file: ${filePath}`,
          data: false,
        };
      }

      const extension = path.extname(filePath);
      if (extension !== '.mp4') {
        return {
          success: false,
          error: `Input file is not a video file: ${filePath}`,
          data: false,
        };
      }

      const fileSize = stats.size;
      if (fileSize > this.MAX_FILE_SIZE_MB) {
        return {
          success: false,
          error: `File size (${Math.round(fileSize / MB)}MB) exceeds maximum allowed size (${this.MAX_FILE_SIZE_MB / MB}MB)`,
          data: false,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      return {
        success: false,
        error: `File validation failed: ${errorMessage}`,
        data: false,
      };
    }
  }

  private async ensureTempDirectoryExists(): Promise<void> {
    if (!fsSync.existsSync(this.tempDirectory)) {
      await fs.mkdir(this.tempDirectory, { recursive: true });
    }
  }
}
