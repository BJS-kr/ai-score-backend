import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';

export class SubmissionQueryResponseDto {
  @ApiProperty({
    description: 'The ID of the submission',
    example: 'string-unique-id',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the student',
    example: 'string-unique-id',
  })
  studentId: string;

  @ApiProperty({
    description: 'The type of the submission',
    example: 'Essay Writing',
  })
  componentType: string;

  @ApiProperty({
    description: 'The text of the submission',
    example: 'This is a submission',
  })
  submitText: string;

  @ApiProperty({
    description: 'The status of the submission',
    example: 'PENDING',
    enum: Object.values(SubmissionStatus),
  })
  status: SubmissionStatus;

  // 완료 시 정보 적재
  @ApiProperty({
    description: 'The score of the submission',
    example: 100,
  })
  score: number;

  @ApiProperty({
    description: 'The feedback of the submission',
    example: 'This is a feedback',
  })
  feedback: string;

  @ApiProperty({
    description: 'The highlights of the submission',
    example: ['This is a highlight', 'This is another highlight'],
  })
  highlights: string[];

  @ApiProperty({
    description: 'The created at of the submission',
    example: '2021-01-01',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The updated at of the submission',
    example: '2021-01-01',
  })
  updatedAt: Date;
}
