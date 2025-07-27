import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VideoService } from '../../src/score/IO/integrations/ffmpeg-video-processing.integration';
import * as fs from 'fs';
import * as path from 'path';

describe('FFmpegVideoProcessingService Integration', () => {
  let service: VideoService;
  let testOutputDir: string;

  beforeAll(async () => {
    testOutputDir = path.join(__dirname, '../../temp/integration-test');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'video.tempDirectory': testOutputDir,
                'video.maxFileSizeMB': 500,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
  });

  afterAll(async () => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testOutputDir, file));
      }
      fs.rmdirSync(testOutputDir);
    }
  });

  describe('Video Processing Integration', () => {
    it('should successfully process sample video', async () => {
      const inputFilePath = path.join(__dirname, './sample-videos/1.mp4');
      const submissionId = 'test-submission-1';

      // Verify input file exists
      expect(fs.existsSync(inputFilePath)).toBe(true);

      // Process video
      const result = await service.processVideo({
        inputFilePath,
        submissionId,
        outputDirectory: testOutputDir,
      });

      // Verify results
      expect(result).toBeDefined();
      expect(result.data?.processedVideoPath).toBeDefined();
      expect(result.data?.extractedAudioPath).toBeDefined();
      expect(result.data?.originalDuration).toBeGreaterThan(0);
      expect(result.data?.processedDuration).toBeGreaterThan(0);

      // Verify output files exist
      if (
        !result.data?.processedVideoPath ||
        !result.data?.extractedAudioPath
      ) {
        throw new Error(
          'Processed video path or extracted audio path is undefined',
        );
      }

      expect(fs.existsSync(result.data.processedVideoPath)).toBe(true);
      expect(fs.existsSync(result.data.extractedAudioPath)).toBe(true);

      // Verify file extensions
      expect(path.extname(result.data.processedVideoPath)).toBe('.mp4');
      expect(path.extname(result.data.extractedAudioPath)).toBe('.m4a');
    }, 30000); // 30 second timeout for video processing
  });

  describe('Error Handling', () => {
    it('should handle non-existent video file', async () => {
      const inputFilePath = path.join(
        __dirname,
        '../../sample-videos/non-existent.mp4',
      );
      const submissionId = 'test-error';

      await expect(
        service.processVideo({
          inputFilePath,
          submissionId,
          outputDirectory: testOutputDir,
        }),
      ).rejects.toThrow('FFmpeg video processing error');
    });

    it('should handle invalid video file', async () => {
      // Create a fake video file (just text)
      const fakeVideoPath = path.join(testOutputDir, 'im_not_a_video.txt');
      fs.writeFileSync(fakeVideoPath, 'This is not a video file');

      const submissionId = 'test-invalid';

      try {
        await expect(
          service.processVideo({
            inputFilePath: fakeVideoPath,
            submissionId,
            outputDirectory: testOutputDir,
          }),
        ).rejects.toThrow();
      } finally {
        if (fs.existsSync(fakeVideoPath)) {
          fs.unlinkSync(fakeVideoPath);
        }
      }
    });
  });
});
