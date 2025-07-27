import {
  applyDecorators,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const FileUpload = ({
  fileName = 'file',
  additionalType,
}: {
  fileName?: string;
  additionalType?: Record<string, SchemaObject>;
} = {}): MethodDecorator =>
  applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fileName]: {
            type: 'string',
            format: 'binary',
          },
          ...(additionalType || {}),
        },
      },
    }),
    UseInterceptors(
      FileInterceptor(fileName, {
        fileFilter: (req, file, cb) => {
          if (file.mimetype === 'video/mp4') {
            cb(null, true);
          } else {
            cb(new BadRequestException('Invalid file type'), false);
          }
        },
      }),
    ),
  );
