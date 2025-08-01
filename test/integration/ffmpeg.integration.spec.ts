import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FfmpegService } from '../../src/score/IO/integrations/ffmpeg/ffmpeg.service';
import * as path from 'path';
import * as fs from 'fs';

describe('FfmpegIntegration', () => {
  let integration: FfmpegService;
  let testOutputDir: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
        }),
      ],
      providers: [FfmpegService],
    }).compile();

    await module.init();

    integration = module.get<FfmpegService>(FfmpegService);

    // Create test output directory
    testOutputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      for (const file of files) {
        const filePath = path.join(testOutputDir, file);
        fs.unlinkSync(filePath);
      }
      fs.rmdirSync(testOutputDir);
    }
  });

  describe('#getVideoInfo', () => {
    it('should successfully get video information from sample video', async () => {
      // Arrange
      const sampleVideoPath = path.join(__dirname, 'sample-videos', '1.mp4');

      // Act
      const result = await integration.getVideoInfo(sampleVideoPath);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.duration).toBeGreaterThan(0);
        expect(result.data.width).toBeGreaterThan(0);
        expect(result.data.height).toBeGreaterThan(0);
        expect(result.data.format).toBeDefined();
        expect(result.data.bitrate).toBeGreaterThan(0);
      }
    });
  });

  describe('#processVideo', () => {
    it('should successfully process video and extract audio', async () => {
      // Arrange
      const sampleVideoPath = path.join(__dirname, 'sample-videos', '2.mp4');
      const submissionId = 'test-submission-456';

      // Act
      const result = await integration.processVideo({
        inputFilePath: sampleVideoPath,
        submissionId,
        outputDirectory: testOutputDir,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.localVideoPath).toBeDefined();
        expect(result.data.localAudioPath).toBeDefined();
        expect(result.data.originalDuration).toBeGreaterThan(0);
        expect(result.data.processedDuration).toBeGreaterThan(0);

        // Check that output files exist
        expect(fs.existsSync(result.data.localVideoPath)).toBe(true);
        expect(fs.existsSync(result.data.localAudioPath)).toBe(true);
      }
    });

    it('should handle different video files', async () => {
      // Arrange
      const sampleVideoPath = path.join(__dirname, 'sample-videos', '3.mp4');
      const submissionId = 'test-submission-789';

      // Act
      const result = await integration.processVideo({
        inputFilePath: sampleVideoPath,
        submissionId,
        outputDirectory: testOutputDir,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.localVideoPath).toBeDefined();
        expect(result.data.localAudioPath).toBeDefined();
      }
    });
  });
});
