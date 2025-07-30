import { BadRequestException } from '@nestjs/common';
import {
  createPaginationClass,
  createPaginationPipe,
  pagination,
  Pagination,
} from './pagination';

describe('Pagination', () => {
  describe('createPaginationClass', () => {
    it('should create pagination class with default options', () => {
      const PaginationClass = createPaginationClass();
      expect(PaginationClass).toBeDefined();

      // Test that the class has the expected properties
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });

    it('should create pagination class with custom defaults', () => {
      const PaginationClass = createPaginationClass({
        defaults: {
          page: 2,
          size: 20,
          sort: 'createdAt',
        },
        possibleSorts: ['createdAt', 'updatedAt', 'name'],
      });

      expect(PaginationClass).toBeDefined();

      // Test that the class has the expected properties
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined(); // Will be set by decorator
      expect(instance.size).toBeUndefined(); // Will be set by decorator
      expect(instance.sort).toBeUndefined(); // Will be set by decorator
    });

    it('should create pagination class with possibleSorts', () => {
      const PaginationClass = createPaginationClass({
        possibleSorts: ['createdAt', 'updatedAt'],
      });

      expect(PaginationClass).toBeDefined();

      // Test that the class has the expected properties
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });

    it('should create pagination class with only page default', () => {
      const PaginationClass = createPaginationClass({
        defaults: {
          page: 5,
        },
      });

      expect(PaginationClass).toBeDefined();
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });

    it('should create pagination class with only size default', () => {
      const PaginationClass = createPaginationClass({
        defaults: {
          size: 25,
        },
      });

      expect(PaginationClass).toBeDefined();
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });

    it('should create pagination class with only sort default', () => {
      const PaginationClass = createPaginationClass({
        defaults: {
          sort: 'updatedAt',
        },
      });

      expect(PaginationClass).toBeDefined();
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });

    it('should create pagination class with empty possibleSorts array', () => {
      const PaginationClass = createPaginationClass({
        possibleSorts: [],
      });

      expect(PaginationClass).toBeDefined();
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });

    it('should create pagination class with single possibleSort', () => {
      const PaginationClass = createPaginationClass({
        possibleSorts: ['createdAt'],
      });

      expect(PaginationClass).toBeDefined();
      const instance = new PaginationClass();
      expect(instance.page).toBeUndefined();
      expect(instance.size).toBeUndefined();
      expect(instance.sort).toBeUndefined();
    });
  });

  describe('Pagination decorator', () => {
    it('should create decorator with default options', () => {
      const decorator = Pagination();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with custom options', () => {
      const decorator = Pagination({
        defaults: {
          page: 1,
          size: 10,
          sort: 'createdAt',
        },
        possibleSorts: ['createdAt', 'updatedAt'],
      });
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with only page default', () => {
      const decorator = Pagination({
        defaults: {
          page: 3,
        },
      });
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with only size default', () => {
      const decorator = Pagination({
        defaults: {
          size: 15,
        },
      });
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with only sort default', () => {
      const decorator = Pagination({
        defaults: {
          sort: 'name',
        },
      });
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with only possibleSorts', () => {
      const decorator = Pagination({
        possibleSorts: ['createdAt', 'updatedAt', 'name'],
      });
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with empty possibleSorts array', () => {
      const decorator = Pagination({
        possibleSorts: [],
      });
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with single possibleSort', () => {
      const decorator = Pagination({
        possibleSorts: ['createdAt'],
      });
      expect(typeof decorator).toBe('function');
    });
  });

  describe('PaginationPipe', () => {
    it('should transform basic pagination without defaults', () => {
      const pipe = createPaginationPipe();

      const value = { page: 2, size: 10 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 10,
        take: 10,
      });
    });

    it('should transform pagination with defaults', () => {
      const pipe = createPaginationPipe({
        defaults: {
          page: 1,
          size: 20,
        },
      });
      const value = { page: 3 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 40, // (3-1) * 20
        take: 20,
      });
    });

    it('should handle missing page with defaults', () => {
      const pipe = createPaginationPipe({
        defaults: {
          page: 2,
          size: 15,
        },
      });
      const value = { page: undefined, size: 10 } as any;

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 10, // (2-1) * 10
        take: 10,
      });
    });

    it('should handle missing size', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // (2-1) * 0
      });
    });

    it('should transform pagination with sort', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, size: 10, sort: 'createdAt,desc' };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle uppercase sort direction', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, size: 10, sort: 'name,ASC' };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
      });
    });

    it('should handle mixed case sort direction', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, size: 10, sort: 'updatedAt,Desc' };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should throw error for invalid sort format without comma', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, sort: 'createdAt' };

      expect(() => pipe.transform(value, {} as never)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(value, {} as never)).toThrow(
        'sort must be in the format of "field,direction"',
      );
    });

    it('should throw error for invalid sort format with multiple commas', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, sort: 'createdAt,desc,extra' };

      expect(() => pipe.transform(value, {} as never)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(value, {} as never)).toThrow(
        'sort must be in the format of "field,direction"',
      );
    });

    it('should throw error for empty field', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, sort: ',desc' };

      expect(() => pipe.transform(value, {} as never)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(value, {} as never)).toThrow(
        'field is required when sort is provided',
      );
    });

    it('should throw error for invalid direction', () => {
      const pipe = createPaginationPipe();
      const value = { page: 1, sort: 'createdAt,invalid' };

      expect(() => pipe.transform(value, {} as never)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(value, {} as never)).toThrow(
        'direction must be either "asc(ASC)" or "desc(DESC)"',
      );
    });

    it('should handle zero page number', () => {
      const pipe = createPaginationPipe();
      const value = { page: 0, size: 10 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // (0-1) * 10 = -10, but the logic uses || 1, so page becomes 1
        take: 10,
      });
    });

    it('should handle zero size', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: 0 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // (2-1) * 0
        // take is not included when size is 0 due to the conditional logic
      });
    });

    it('should handle pagination with sort and no size', () => {
      const pipe = createPaginationPipe();
      const value = { page: 3, sort: 'name,asc' };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // (3-1) * 0
        orderBy: { name: 'asc' },
      });
    });

    it('should handle undefined page with defaults', () => {
      const pipe = createPaginationPipe({
        defaults: {
          page: 1,
          size: 10,
        },
      });
      const value = { page: undefined, size: 5 } as any;

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // (1-1) * 5
        take: 5,
      });
    });

    it('should handle undefined size with defaults', () => {
      const pipe = createPaginationPipe({
        defaults: {
          page: 2,
          size: 20,
        },
      });
      const value = { page: 3, size: undefined } as any;

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 40, // (3-1) * 20
        take: 20,
      });
    });

    it('should handle undefined sort', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: 10, sort: undefined };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 10, // (2-1) * 10
        take: 10,
      });
    });

    it('should handle empty string sort', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: 10, sort: '' };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 10, // (2-1) * 10
        take: 10,
      });
    });

    it('should handle whitespace-only sort', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: 10, sort: '   ' };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 10, // (2-1) * 10
        take: 10,
      });
    });

    it('should handle negative page number', () => {
      const pipe = createPaginationPipe();
      const value = { page: -1, size: 10 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // if page is negative, skip is 0
        take: 10,
      });
    });

    it('should handle negative size', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: -5 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 0, // if size is negative, take is not included
      });
    });

    it('should handle decimal page number', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2.5, size: 10 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 10, // if decimal, skip is rounded down
        take: 10,
      });
    });

    it('should handle decimal size', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: 7.5 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 7, // if decimal, skip is rounded down
        take: 7,
      });
    });

    it('should handle very large size', () => {
      const pipe = createPaginationPipe();
      const value = { page: 2, size: 1000000 };

      const result = pipe.transform(value, {} as never);

      expect(result).toEqual({
        skip: 1000000, // (2-1) * 1000000
        take: 1000000,
      });
    });
  });
});
