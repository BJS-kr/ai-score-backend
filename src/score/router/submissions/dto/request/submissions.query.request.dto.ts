import { SubmissionStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class SubmissionsQueryRequestDto {
  @ApiProperty({
    description: 'Submission status',
    enum: SubmissionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}
