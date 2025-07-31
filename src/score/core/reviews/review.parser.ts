import { Injectable } from '@nestjs/common';
import { StrictReturn } from 'src/score/helper/processor/strict.return';
import { EssayEvaluation } from '../submissions/interfaces/essay.evaluation';

@Injectable()
export class ReviewParser {
  parseAndValidateReview(content: string): StrictReturn<EssayEvaluation> {
    try {
      const trimmedContent = this.trimJsonAnnotationIfExists(content);
      const evaluation: EssayEvaluation = JSON.parse(
        trimmedContent,
      ) as EssayEvaluation;

      if (!this.isValidEvaluation(evaluation)) {
        return {
          success: false,
          error: 'Invalid response format',
        };
      }

      // Ensure highlights are strings
      const validHighlights = evaluation.highlights.filter(
        (highlight) => typeof highlight === 'string' && highlight.trim(),
      );

      return {
        success: true,
        data: {
          score: Math.round(evaluation.score),
          feedback: evaluation.feedback.trim(),
          highlights: validHighlights,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);

      return {
        success: false,
        error: `Response parsing failed: ${errorMessage}`,
      };
    }
  }

  private isValidEvaluation(value: EssayEvaluation): value is EssayEvaluation {
    if (!value) {
      return false;
    }

    if (typeof value.score !== 'number') {
      return false;
    }

    if (value.score < 0 || value.score > 10) {
      return false;
    }

    if (typeof value.feedback !== 'string' || !value.feedback.trim()) {
      return false;
    }

    if (!Array.isArray(value.highlights)) {
      return false;
    }

    return true;
  }

  private trimJsonAnnotationIfExists(content: string): string {
    const trimmed = content.trim();
    const jsonBlockRegex = /^```json\s*([\s\S]*?)\s*```$/;
    const match = trimmed.match(jsonBlockRegex);
    if (match) {
      return match[1].trim();
    }
    return trimmed;
  }
}
