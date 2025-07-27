import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonResponseDto } from 'src/common/response/common.response.dto';
import { StrictReturn } from 'src/score/helper/stricter/strict.return';
import { SubmissionResult } from 'src/score/core/submission/interfaces/submission.result';
import { SubmissionRequestDto } from '../request/submission.request.dto';

export class SubmissionResponseDto extends CommonResponseDto {
  @ApiProperty({
    type: String,
    description: 'The student ID',
  })
  studentId: string;

  @ApiProperty({
    type: String,
    description: 'The student name',
  })
  studentName: string;

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
    submissionResult: StrictReturn<SubmissionResult | null>,
    { studentId, studentName, submitText }: SubmissionRequestDto,
    apiLatency: number,
  ): SubmissionResponseDto {
    if (!this.isSubmissionResult(submissionResult.data)) {
      return {
        result: 'failed',
        message: submissionResult.message ?? null,
        studentId,
        studentName,
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
      studentId,
      studentName,
      score: submissionResult.data.score,
      feedback: submissionResult.data?.feedback,
      highlights: submissionResult.data?.highlights,
      submitText: submissionResult.success ? submitText : null,
      highlightSubmitText: submissionResult.data.highlightedText,
      mediaUrl: {
        video: submissionResult.data.videoUrl,
        audio: submissionResult.data.audioUrl,
      },
      apiLatency,
    };
  }
}
