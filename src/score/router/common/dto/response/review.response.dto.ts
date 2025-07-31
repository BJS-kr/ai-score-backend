import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  isSuccess,
  StrictReturn,
} from 'src/score/helper/processor/strict.return';
import { SubmissionResult } from 'src/score/core/submissions/interfaces/submission.result';

export class ReviewResponseDto {
  @ApiProperty({
    enum: ['ok', 'failed'],
  })
  result: 'ok' | 'failed';

  @ApiProperty({
    type: 'string',
    description: 'Contextual message',
  })
  message: string | null;

  @ApiProperty({
    type: String,
    description: 'The student ID',
  })
  studentId: string | null;

  @ApiProperty({
    type: String,
    description: 'The student name',
  })
  studentName: string | null;

  @ApiPropertyOptional({
    type: Number,
  })
  score: number | null;

  @ApiPropertyOptional({
    type: String,
  })
  feedback: string | null;

  @ApiPropertyOptional({
    type: [String],
  })
  highlights: string[] | null;

  @ApiPropertyOptional({
    type: String,
  })
  submitText: string | null;

  @ApiPropertyOptional({
    type: String,
  })
  highlightSubmitText: string | null;

  @ApiPropertyOptional({
    type: Object,
  })
  mediaUrl: {
    video: string;
    audio: string;
  } | null;

  @ApiProperty({
    type: Number,
    description: 'The API latency in milliseconds',
  })
  apiLatency: number;

  static isSubmissionResult(
    value: SubmissionResult | null,
  ): value is SubmissionResult {
    return !!value;
  }

  static build(
    submissionResult: StrictReturn<SubmissionResult>,
    apiLatency: number,
  ): ReviewResponseDto {
    if (!isSuccess(submissionResult)) {
      return {
        result: 'failed',
        message: submissionResult.error ?? null,
        studentId: null,
        studentName: null,
        score: null,
        feedback: null,
        highlights: null,
        submitText: null,
        highlightSubmitText: null,
        mediaUrl: null,
        apiLatency,
      };
    }

    return {
      result: submissionResult.success ? 'ok' : 'failed',
      message: submissionResult.message ?? null,
      studentId: submissionResult.data.studentId,
      studentName: submissionResult.data.studentName,
      score: submissionResult.data.score,
      feedback: submissionResult.data.feedback,
      highlights: submissionResult.data.highlights,
      submitText: submissionResult.data.submitText,
      highlightSubmitText: submissionResult.data.highlightedText,
      mediaUrl: {
        video: submissionResult.data.videoUrl,
        audio: submissionResult.data.audioUrl,
      },
      apiLatency,
    };
  }
}
