import { BadRequestException, PipeTransform, Query } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export type Pagination = {
  skip: number;
  take?: number;
  orderBy?: {
    [key: string]: 'asc' | 'desc';
  };
};

export type PaginationDefaults<T extends string> = {
  defaults?: {
    page?: number;
    size?: number;
    sort?: T;
  };
};

export const Pagination = <T extends string, S extends T>(
  options: PaginationDefaults<S> & {
    possibleSorts?: T[];
  } = {},
) => {
  const PaginationClass = createPaginationClass(options);

  return (target: any, propertyKey: string, parameterIndex: number) => {
    // 실제로 data processing이 일어나는 곳
    pagination(options)(target, propertyKey, parameterIndex);

    // swagger를 위해 metadata를 대치하는 곳
    const predefinedMetadata = Reflect.getMetadata(
      'design:paramtypes',
      target,
      propertyKey,
    );

    predefinedMetadata[parameterIndex] = PaginationClass;

    Reflect.defineMetadata(
      'design:paramtypes',
      predefinedMetadata,
      target,
      propertyKey,
    );
  };
};

export const pagination = <T extends string>({
  defaults,
}: PaginationDefaults<T> = {}) => {
  const PaginationPipe = createPaginationPipe({ defaults });
  return Query(PaginationPipe);
};

export const createPaginationPipe = <T extends string>({
  defaults,
}: PaginationDefaults<T> = {}) => {
  class PaginationPipe implements PipeTransform {
    transform(
      value: {
        page: number;
        size?: number;
        sort?: string;
      },
      _: never,
    ) {
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

export const createPaginationClass = (
  options: Parameters<typeof Pagination>[0] = {},
) => {
  class DynamicPaginationQuery {
    @ApiProperty({
      name: 'page',
      description: '페이지 번호',
      type: Number,
      required: false,
      ...(options.defaults?.page && {
        default: options.defaults.page,
        example: options.defaults.page,
      }),
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page: number;

    @ApiProperty({
      name: 'size',
      description: '한 페이지에 보여지는 개수',
      type: Number,
      required: false,
      ...(options.defaults?.size && {
        default: options.defaults.size,
        example: options.defaults.size,
      }),
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    size?: number;

    @ApiProperty({
      name: 'sort',
      description: '정렬 기준 필드와 방향',
      ...(options.possibleSorts
        ? {
            enum: options.possibleSorts.reduce((acc, field) => {
              return [...acc, `${field},DESC`, `${field},ASC`];
            }, [] as string[]),
          }
        : { type: String }),
      ...(options.defaults?.sort && {
        default: `${options.defaults.sort},DESC`,
        example: `${options.defaults.sort},DESC`,
      }),
      required: false,
    })
    @IsOptional()
    @IsString()
    sort?: string;
  }

  return DynamicPaginationQuery;
};
