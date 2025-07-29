import { ApiProperty } from '@nestjs/swagger';
import { SubmissionQueryResponseDto } from './submission.query.response.dto';

export class SubmissionsQueryResponseDto {
  @ApiProperty({
    type: [SubmissionQueryResponseDto],
  })
  submissions: SubmissionQueryResponseDto[];

  @ApiProperty({
    type: Number,
    description: 'The total number of submissions of given condition',
  })
  total: number;
}
