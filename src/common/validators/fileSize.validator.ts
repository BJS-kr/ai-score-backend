import { PipeTransform, Injectable } from '@nestjs/common';

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
