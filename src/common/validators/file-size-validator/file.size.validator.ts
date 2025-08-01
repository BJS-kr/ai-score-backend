import { PipeTransform, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  private readonly MAX_FILE_SIZE_MB: number;
  constructor(private readonly configService: ConfigService) {
    this.MAX_FILE_SIZE_MB =
      parseInt(this.configService.get<string>('MAX_FILE_SIZE_MB') || '50') *
      1024 *
      1024;
  }

  transform(value: Express.Multer.File) {
    return value &&
      value.size &&
      value.size > 0 &&
      value.size < this.MAX_FILE_SIZE_MB
      ? value
      : null;
  }
}
