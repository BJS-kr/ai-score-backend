import { Test, TestingModule } from '@nestjs/testing';
import { isSuccess } from '../../helper/processor/strict.return';
import { ReviewParserService } from './review.parser.service';
import { caught } from 'src/score/helper/processor/caught';

describe('ReviewParserService', () => {
  let service: ReviewParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewParserService],
    }).compile();

    service = module.get<ReviewParserService>(ReviewParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseAndValidateReview', () => {
    it('should successfully parse valid JSON review response', () => {
      // Arrange
      const validResponse =
        '{"score": 8, "feedback": "Good essay with clear structure", "highlights": ["grammar", "vocabulary"]}';

      // Act
      const result = service.parseAndValidateReview(validResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          score: 8,
          feedback: 'Good essay with clear structure',
          highlights: ['grammar', 'vocabulary'],
        });
      }
    });

    it('should return error for invalid JSON', async () => {
      // Arrange
      const invalidResponse =
        '{"score": 8, "feedback": "Good essay", "highlights": ["grammar"'; // Missing closing brace

      // Act
      const result = service.parseAndValidateReview(invalidResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toContain('Response parsing failed');
      }
    });

    it('should return error for missing required fields', () => {
      // Arrange
      const missingFieldsResponse = '{"score": 8, "feedback": "Good essay"}'; // Missing highlights

      // Act
      const result = service.parseAndValidateReview(missingFieldsResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should return error for invalid score type', () => {
      // Arrange
      const invalidScoreResponse =
        '{"score": "eight", "feedback": "Good essay", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(invalidScoreResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should return error for score out of range', () => {
      // Arrange
      const outOfRangeResponse =
        '{"score": 15, "feedback": "Good essay", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(outOfRangeResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should return error for negative score', () => {
      // Arrange
      const negativeScoreResponse =
        '{"score": -1, "feedback": "Good essay", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(negativeScoreResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should return error for invalid feedback type', () => {
      // Arrange
      const invalidFeedbackResponse =
        '{"score": 8, "feedback": 123, "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(invalidFeedbackResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should return error for empty feedback', () => {
      // Arrange
      const emptyFeedbackResponse =
        '{"score": 8, "feedback": "", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(emptyFeedbackResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should return error for invalid highlights type', () => {
      // Arrange
      const invalidHighlightsResponse =
        '{"score": 8, "feedback": "Good essay", "highlights": "grammar"}';

      // Act
      const result = service.parseAndValidateReview(invalidHighlightsResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should filter out non-string highlights', () => {
      // Arrange
      const invalidHighlightsResponse =
        '{"score": 8, "feedback": "Good essay", "highlights": ["grammar", 123]}';

      // Act
      const result = service.parseAndValidateReview(invalidHighlightsResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.highlights).toEqual(['grammar']);
      }
    });

    it('should filter out empty highlights', () => {
      // Arrange
      const emptyHighlightsResponse =
        '{"score": 8, "feedback": "Good essay", "highlights": ["grammar", "", "vocabulary"]}';

      // Act
      const result = service.parseAndValidateReview(emptyHighlightsResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.highlights).toEqual(['grammar', 'vocabulary']);
      }
    });

    it('should successfully parse response with decimal score', () => {
      // Arrange
      const decimalScoreResponse =
        '{"score": 8.5, "feedback": "Good essay", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(decimalScoreResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.score).toBe(9); // Should be rounded
      }
    });

    it('should successfully parse response with multiple highlights', () => {
      // Arrange
      const multipleHighlightsResponse =
        '{"score": 7, "feedback": "Good essay", "highlights": ["grammar", "vocabulary", "structure"]}';

      // Act
      const result = service.parseAndValidateReview(multipleHighlightsResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.highlights).toEqual([
          'grammar',
          'vocabulary',
          'structure',
        ]);
      }
    });

    it('should successfully parse response with long feedback', () => {
      // Arrange
      const longFeedbackResponse =
        '{"score": 9, "feedback": "This is a very detailed feedback with multiple sentences and specific comments about the essay structure, grammar usage, and vocabulary choices.", "highlights": ["specific word"]}';

      // Act
      const result = service.parseAndValidateReview(longFeedbackResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.feedback).toContain('detailed feedback');
      }
    });

    it('should handle special characters in feedback and highlights', () => {
      // Arrange
      const specialCharsResponse =
        '{"score": 6, "feedback": "Essay has issues with grammar & punctuation!", "highlights": ["grammar &", "punctuation!"]}';

      // Act
      const result = service.parseAndValidateReview(specialCharsResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.score).toBe(6);
        expect(result.data.feedback).toBe(
          'Essay has issues with grammar & punctuation!',
        );
        expect(result.data.highlights).toEqual(['grammar &', 'punctuation!']);
      }
    });

    it('should handle JSON with code block annotation', () => {
      // Arrange
      const jsonWithAnnotation = `\`\`\`json
{
  "score": 8,
  "feedback": "Good essay",
  "highlights": ["grammar"]
}
\`\`\``;

      // Act
      const result = service.parseAndValidateReview(jsonWithAnnotation);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.score).toBe(8);
        expect(result.data.feedback).toBe('Good essay');
        expect(result.data.highlights).toEqual(['grammar']);
      }
    });

    it('should handle JSON with whitespace in code block', () => {
      // Arrange
      const jsonWithWhitespace = `\`\`\`json
  {
    "score": 7,
    "feedback": "Good essay",
    "highlights": ["vocabulary"]
  }
\`\`\``;

      // Act
      const result = service.parseAndValidateReview(jsonWithWhitespace);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.score).toBe(7);
        expect(result.data.feedback).toBe('Good essay');
        expect(result.data.highlights).toEqual(['vocabulary']);
      }
    });

    it('should handle null value', () => {
      // Arrange
      const nullResponse = 'null';

      // Act
      const result = service.parseAndValidateReview(nullResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toBe('Invalid response format');
      }
    });

    it('should handle undefined value', async () => {
      // Arrange
      const undefinedResponse = 'undefined';

      // Act
      const result = service.parseAndValidateReview(undefinedResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toContain('Response parsing failed');
      }
    });

    it('should handle empty string', async () => {
      // Arrange
      const emptyResponse = '';

      // Act
      const result = service.parseAndValidateReview(emptyResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toContain('Response parsing failed');
      }
    });

    it('should handle whitespace-only string', async () => {
      // Arrange
      const whitespaceResponse = '   ';

      // Act
      const result = service.parseAndValidateReview(whitespaceResponse);

      // Assert
      expect(result.success).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error).toContain('Response parsing failed');
      }
    });

    it('should trim feedback whitespace', () => {
      // Arrange
      const responseWithWhitespace =
        '{"score": 8, "feedback": "  Good essay  ", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(responseWithWhitespace);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.feedback).toBe('Good essay');
      }
    });

    it('should handle highlights with whitespace', () => {
      // Arrange
      const responseWithWhitespace =
        '{"score": 8, "feedback": "Good essay", "highlights": ["  grammar  ", "vocabulary"]}';

      // Act
      const result = service.parseAndValidateReview(responseWithWhitespace);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.highlights).toEqual(['  grammar  ', 'vocabulary']);
      }
    });

    it('should handle score of 0', () => {
      // Arrange
      const zeroScoreResponse =
        '{"score": 0, "feedback": "Poor essay", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(zeroScoreResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.score).toBe(0);
      }
    });

    it('should handle score of 10', () => {
      // Arrange
      const maxScoreResponse =
        '{"score": 10, "feedback": "Excellent essay", "highlights": ["grammar"]}';

      // Act
      const result = service.parseAndValidateReview(maxScoreResponse);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.score).toBe(10);
      }
    });
  });
});
