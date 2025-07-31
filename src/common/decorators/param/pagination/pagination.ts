import { Query } from '@nestjs/common';
import { createPaginationClass } from './paigination.class.factory';
import { createPaginationPipe } from './pagination.pipe.factory';

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

  return (target: object, propertyKey: string, parameterIndex: number) => {
    // 실제로 data processing이 일어나는 곳
    pagination(options)(target, propertyKey, parameterIndex);

    // swagger를 위해 metadata를 대치하는 곳
    const predefinedMetadata = Reflect.getMetadata(
      'design:paramtypes',
      target,
      propertyKey,
    ) as any[];

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
