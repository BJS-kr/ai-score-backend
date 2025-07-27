import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File, _: never) {
    // TODO: configurable
    const limit = 1024 * 1024 * 500;
    return value.size && value.size < limit;
  }
}
