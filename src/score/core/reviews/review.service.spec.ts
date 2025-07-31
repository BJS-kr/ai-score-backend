import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { Processor } from 'src/score/helper/processor/processor';
import { ReviewParser } from './review.parser';
import { AzureOpenAIIntegration } from 'src/score/IO/integrations/azure-openai.integration';
import { SubmissionRepository } from 'src/score/IO/respositories/submission.respository';
import { LoggerService } from 'src/common/logger/logger.service';
import { createMock } from '@golevelup/ts-jest';
import {
  LogContext,
  ReviewLogInfo,
} from 'src/common/decorators/param/log-context/log.context';

describe('ReviewService', () => {
  let service: ReviewService;
  let processor: jest.Mocked<Processor>;
  let reviewParser: jest.Mocked<ReviewParser>;
  let azureOpenAIIntegration: jest.Mocked<AzureOpenAIIntegration>;
  let submissionRepository: jest.Mocked<SubmissionRepository>;

  beforeEach(async () => {
    const mockProcessor = createMock<Processor>();
    const mockReviewParser = createMock<ReviewParser>();
    const mockAzureOpenAIIntegration = createMock<AzureOpenAIIntegration>();
    const mockSubmissionRepository = createMock<SubmissionRepository>();
    const mockLogger = createMock<LoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: Processor,
          useValue: mockProcessor,
        },
        {
          provide: ReviewParser,
          useValue: mockReviewParser,
        },
        {
          provide: AzureOpenAIIntegration,
          useValue: mockAzureOpenAIIntegration,
        },
        {
          provide: SubmissionRepository,
          useValue: mockSubmissionRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    processor = module.get(Processor);
    reviewParser = module.get(ReviewParser);
    azureOpenAIIntegration = module.get(AzureOpenAIIntegration);
    submissionRepository = module.get(SubmissionRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('review', () => {
    const mockLogContext: LogContext<ReviewLogInfo> = {
      traceId: 'test-trace-id',
      requestUri: '/test/uri',
      startTime: Date.now(),
      logInfo: {
        submissionId: 'test-submission-id',
      },
    };

    it('should complete review successfully', async () => {
      // Arrange
      const submitText = 'This is a test essay about technology.';
      const studentId = 'test-student-id';
      const studentName = 'Test Student';
      const videoSasUrl = 'https://blob.com/video.mp4?sas';
      const audioSasUrl = 'https://blob.com/audio.mp3?sas';

      // Mock successful raw review response
      azureOpenAIIntegration.getRawReviewResponse.mockResolvedValue({
        success: true,
        data: {
          reviewPrompt: 'Test prompt',
          reviewResponse:
            'Score: 85\nFeedback: Good essay\nHighlights: technology, essay',
        },
      });

      // Mock successful review parsing
      reviewParser.parseAndValidateReview.mockReturnValue({
        success: true,
        data: {
          score: 85,
          feedback: 'Good essay',
          highlights: ['technology', 'essay'],
        },
      });

      // Mock processor.process to return success for raw review
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          reviewPrompt: 'Test prompt',
          reviewResponse:
            'Score: 85\nFeedback: Good essay\nHighlights: technology, essay',
        },
      });

      // Mock processor.process to return success for review parsing
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          score: 85,
          feedback: 'Good essay',
          highlights: ['technology', 'essay'],
        },
      });

      // Act
      const result = await service.review(
        submitText,
        studentId,
        studentName,
        videoSasUrl,
        audioSasUrl,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(85);
        expect(result.data.feedback).toBe('Good essay');
        expect(result.data.highlights).toEqual(['technology', 'essay']);
        expect(result.data.highlightedText).toContain('<b>technology</b>');
        expect(result.data.highlightedText).toContain('<b>essay</b>');
        expect(result.data.videoUrl).toBe(videoSasUrl);
        expect(result.data.audioUrl).toBe(audioSasUrl);
        expect(result.data.studentId).toBe(studentId);
        expect(result.data.studentName).toBe(studentName);
        expect(result.data.submitText).toBe(submitText);
      }

      expect(azureOpenAIIntegration.getRawReviewResponse).toHaveBeenCalled();
      expect(reviewParser.parseAndValidateReview).toHaveBeenCalledWith(
        'Score: 85\nFeedback: Good essay\nHighlights: technology, essay',
      );
      expect(submissionRepository.completeSubmission).toHaveBeenCalledWith(
        'test-submission-id',
        85,
        'Good essay',
        ['technology', 'essay'],
        mockLogContext,
      );
    });

    it('should return error when raw review response fails', async () => {
      // Arrange
      const submitText = 'This is a test essay.';
      const studentId = 'test-student-id';
      const studentName = 'Test Student';
      const videoSasUrl = 'https://blob.com/video.mp4?sas';
      const audioSasUrl = 'https://blob.com/audio.mp3?sas';

      // Mock failed raw review response
      azureOpenAIIntegration.getRawReviewResponse.mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      // Mock processor.process to return failure
      processor.process.mockResolvedValueOnce({
        success: false,
        error: 'AI service unavailable',
      });

      // Act
      const result = await service.review(
        submitText,
        studentId,
        studentName,
        videoSasUrl,
        audioSasUrl,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('AI service unavailable');
      }
      expect(reviewParser.parseAndValidateReview).not.toHaveBeenCalled();
      expect(submissionRepository.completeSubmission).not.toHaveBeenCalled();
    });

    it('should return error when review parsing fails', async () => {
      // Arrange
      const submitText = 'This is a test essay.';
      const studentId = 'test-student-id';
      const studentName = 'Test Student';
      const videoSasUrl = 'https://blob.com/video.mp4?sas';
      const audioSasUrl = 'https://blob.com/audio.mp3?sas';

      // Mock successful raw review response
      azureOpenAIIntegration.getRawReviewResponse.mockResolvedValue({
        success: true,
        data: {
          reviewPrompt: 'Test prompt',
          reviewResponse: 'Invalid response format',
        },
      });

      // Mock failed review parsing
      reviewParser.parseAndValidateReview.mockReturnValue({
        success: false,
        error: 'Invalid response format',
      });

      // Mock processor.process to return success for raw review
      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          reviewPrompt: 'Test prompt',
          reviewResponse: 'Invalid response format',
        },
      });

      // Mock processor.process to return failure for review parsing
      processor.process.mockResolvedValueOnce({
        success: false,
        error: 'Invalid response format',
      });

      // Act
      const result = await service.review(
        submitText,
        studentId,
        studentName,
        videoSasUrl,
        audioSasUrl,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid response format');
      }
      expect(submissionRepository.completeSubmission).not.toHaveBeenCalled();
    });

    it('should highlight text correctly', async () => {
      // Arrange
      const submitText = 'This essay discusses technology and innovation.';
      const studentId = 'test-student-id';
      const studentName = 'Test Student';
      const videoSasUrl = 'https://blob.com/video.mp4?sas';
      const audioSasUrl = 'https://blob.com/audio.mp3?sas';

      // Mock successful responses
      azureOpenAIIntegration.getRawReviewResponse.mockResolvedValue({
        success: true,
        data: {
          reviewPrompt: 'Test prompt',
          reviewResponse:
            'Score: 90\nFeedback: Excellent\nHighlights: technology, innovation',
        },
      });

      reviewParser.parseAndValidateReview.mockReturnValue({
        success: true,
        data: {
          score: 90,
          feedback: 'Excellent',
          highlights: ['technology', 'innovation'],
        },
      });

      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          reviewPrompt: 'Test prompt',
          reviewResponse:
            'Score: 90\nFeedback: Excellent\nHighlights: technology, innovation',
        },
      });

      processor.process.mockResolvedValueOnce({
        success: true,
        data: {
          score: 90,
          feedback: 'Excellent',
          highlights: ['technology', 'innovation'],
        },
      });

      // Act
      const result = await service.review(
        submitText,
        studentId,
        studentName,
        videoSasUrl,
        audioSasUrl,
        mockLogContext,
      );

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.highlightedText).toBe(
          'This essay discusses <b>technology</b> and <b>innovation</b>.',
        );
      }
    });
  });
});
