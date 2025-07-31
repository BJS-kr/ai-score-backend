import { BadRequestException, PipeTransform } from '@nestjs/common';
import { Pagination, PaginationDefaults } from './pagination';

export type PaginationPipeValue = {
  page: number;
  size?: number;
  sort?: string;
};

export const createPaginationPipe = <T extends string>({
  defaults,
}: PaginationDefaults<T> = {}) => {
  class PaginationPipe implements PipeTransform {
    transform(value: PaginationPipeValue) {
      // default page가 남아있기 때문에 0으로 처리
      value.page = Math.floor((value.page ?? 0) < 0 ? 0 : (value.page ?? 0));
      // size가 0일 경우 return에 포함되지 않음
      value.size = Math.floor((value.size ?? 0) <= 0 ? 0 : (value.size ?? 0));
      value.sort = value.sort?.trim();

      const page = value.page || defaults?.page || 1;
      // size가 없으면 무한
      const size = value.size || defaults?.size;
      // size가 제공되지 않거나 0일 경우 skip도 0
      const skip = (page - 1) * (size ?? 0);

      if (!value.sort) {
        return {
          skip,
          ...(size && { take: size }),
        } satisfies Pagination;
      }
      if (!value.sort.includes(',')) {
        throw new BadRequestException(
          'sort must be in the format of "field,direction"',
        );
      }

      const separatedSort = value.sort.split(',');
      if (separatedSort.length !== 2) {
        throw new BadRequestException(
          'sort must be in the format of "field,direction"',
        );
      }

      const field = separatedSort[0];
      const direction = separatedSort[1].toLowerCase();

      if (!field) {
        throw new BadRequestException(
          'field is required when sort is provided',
        );
      }
      if (direction !== 'asc' && direction !== 'desc') {
        throw new BadRequestException(
          'direction must be either "asc(ASC)" or "desc(DESC)"',
        );
      }

      return {
        skip,
        ...(size && { take: size }),
        orderBy: { [field]: direction },
      } satisfies Pagination;
    }
  }

  return new PaginationPipe();
};
