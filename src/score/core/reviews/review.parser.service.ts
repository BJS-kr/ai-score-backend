import { Injectable } from '@nestjs/common';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { EssayEvaluation } from './review.service';

@Injectable()
export class ReviewParserService {
  parseAndValidateReview(content: string): StrictReturn<EssayEvaluation> {
    const trimmedContent = this.trimJsonAnnotationIfExists(content);
    const evaluation = this.tryParse(trimmedContent);

    if (!isSuccess(evaluation)) {
      return evaluation;
    }

    if (!this.isValidEvaluation(evaluation.data)) {
      return {
        success: false,
        error: 'Invalid response format',
      };
    }

    const validHighlights = evaluation.data.highlights.filter(
      (highlight) => typeof highlight === 'string' && highlight.trim(),
    );

    return {
      success: true,
      data: {
        score: Math.round(evaluation.data.score),
        feedback: evaluation.data.feedback.trim(),
        highlights: validHighlights,
      },
    };
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

  private tryParse(content: string): StrictReturn<EssayEvaluation> {
    try {
      return {
        success: true,
        data: JSON.parse(content) as EssayEvaluation,
      };
    } catch {
      return {
        success: false,
        error: 'Response parsing failed',
      };
    }
  }
}
