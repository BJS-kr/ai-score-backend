import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RevisionRequestDto {
  @ApiProperty({
    description: 'The submission id',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  submissionId: string;
}
