import { ApiProperty } from '@nestjs/swagger';
import { RevisionStatus } from '@prisma/client';

export class RevisionResponseDto {
  @ApiProperty({
    description: 'Revision id',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Submission id',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Revision status',
    enum: RevisionStatus,
    example: RevisionStatus.PENDING,
  })
  status: RevisionStatus;

  @ApiProperty({
    description: 'Revision created at',
    example: new Date(),
  })
  createdAt: Date;
}
