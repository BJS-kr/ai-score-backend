import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SubmissionRequestDto {
  @ApiProperty({
    type: 'string',
    description: 'The student ID',
  })
  @IsString()
  studentId: string;

  @ApiProperty({
    type: 'string',
    description: 'The student name',
  })
  @IsString()
  studentName: string;

  @ApiProperty({
    type: 'string',
    description: 'The component type',
  })
  @IsString()
  componentType: string;

  @ApiProperty({
    type: 'string',
    description: 'The submit text',
  })
  @IsString()
  submitText: string;
}
