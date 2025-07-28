import { ApiProperty } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsString, IsUUID } from 'class-validator';
/**
 * multipart/form-data 형식에 body를 같이 넣으려고하니
 * SchemaObject 형식으로 전달하는 것이 가장 쉬워보여
 * ApiProperty등의 데코레이터를 부착하지 않고 단순히 두 개의 객체를 만들었습니다.
 */
export class SubmissionRequestDto {
  @ApiProperty({
    type: 'string',
    description: 'The student ID',
  })
  @IsUUID()
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

export const SubmissionRequestSchema: Record<string, SchemaObject> = {
  studentId: {
    type: 'string',
  },
  studentName: {
    type: 'string',
  },
  componentType: {
    type: 'string',
  },
  submitText: {
    type: 'string',
  },
};
