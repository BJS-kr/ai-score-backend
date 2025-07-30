import { PipeTransform, Injectable } from '@nestjs/common';

export const FILE_NOT_PROVIDED = Symbol('FILE_NOT_PROVIDED');
export const FILE_SIZE_EXCEEDED = Symbol('FILE_SIZE_EXCEEDED');

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File) {
    // TODO: configurable
    const limit = 1024 * 1024 * 50;
    return value && value.size && value.size > 0 && value.size < limit
      ? value
      : null;
  }
}
