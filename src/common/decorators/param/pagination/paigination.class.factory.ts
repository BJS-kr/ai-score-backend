import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Pagination } from './pagination';

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
