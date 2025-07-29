import { ApiProperty } from '@nestjs/swagger';
import { RevisionResponseDto } from './revision.response.dto';

export class RevisionsResponseDto {
  @ApiProperty({
    type: [RevisionResponseDto],
  })
  revisions: RevisionResponseDto[];

  @ApiProperty({
    type: Number,
    description: 'The total number of revisions',
  })
  total: number;
}
