import { ApiProperty } from '@nestjs/swagger';

export class CommonResponseDto {
  @ApiProperty({
    enum: ['ok', 'failed'],
  })
  result: 'ok' | 'failed';

  @ApiProperty({
    type: 'string',
    description: 'Contextual message',
  })
  message: string | null;
}
