import { applyDecorators, HttpCode, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export const AlwaysOk = ({
  description,
  type,
}: {
  description: string;
  type: Type<unknown> | string;
}): MethodDecorator =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: `
      ${description}
      \n\n
      Regardless of result ok/failed, status code is always 200. 
      Actual status information is in the body.
      `,
      type,
    }),
    HttpCode(200),
  );
