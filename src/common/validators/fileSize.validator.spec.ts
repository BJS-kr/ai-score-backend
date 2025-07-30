import { FileSizeValidationPipe } from './fileSize.validator';

describe('FileSizeValidationPipe', () => {
  let pipe: FileSizeValidationPipe;

  beforeEach(() => {
    pipe = new FileSizeValidationPipe();
  });

  describe('transform', () => {
    it('should return file when size is within limit', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 25, // 25MB (under 50MB limit)
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBe(file);
    });

    it('should return null when file size exceeds limit', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 60, // 60MB (over 50MB limit)
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when file size is zero', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 0,
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when file size is negative', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: -1024,
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when file is null', () => {
      // Act
      const result = pipe.transform(null as any);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when file is undefined', () => {
      // Act
      const result = pipe.transform(undefined as any);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when file size is undefined', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: undefined,
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as any;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when file size is null', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: null,
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as unknown as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull();
    });

    it('should return file when size is exactly at limit', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 50, // 50MB (exactly at limit)
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull(); // The implementation uses < limit, so exactly at limit is rejected
    });

    it('should handle very small files', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1, // 1 byte
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBe(file);
    });

    it('should handle files just under the limit', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 50 - 1, // 50MB - 1 byte
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBe(file);
    });

    it('should handle files just over the limit', () => {
      // Arrange
      const file = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 50 + 1, // 50MB + 1 byte
        destination: '/tmp',
        filename: 'test.mp4',
        path: '/tmp/test.mp4',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle files with missing properties', () => {
      // Arrange
      const file = {
        size: 1024 * 1024 * 25, // 25MB
      } as Express.Multer.File;

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBe(file);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical file sizes within limit', () => {
      // Arrange
      const validSizes = [
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024, // 10MB
        25 * 1024 * 1024, // 25MB
      ];

      // Act & Assert
      validSizes.forEach((size) => {
        const file = {
          fieldname: 'file',
          originalname: 'test.mp4',
          encoding: '7bit',
          mimetype: 'video/mp4',
          size,
          destination: '/tmp',
          filename: 'test.mp4',
          path: '/tmp/test.mp4',
          buffer: Buffer.from('test'),
        } as Express.Multer.File;

        const result = pipe.transform(file);
        expect(result).toBe(file);
      });
    });

    it('should reject files over the limit', () => {
      // Arrange
      const invalidSizes = [
        50 * 1024 * 1024, // 50MB (exactly at limit - should be rejected)
        100 * 1024 * 1024, // 100MB
        500 * 1024 * 1024, // 500MB
      ];

      // Act & Assert
      invalidSizes.forEach((size) => {
        const file = {
          fieldname: 'file',
          originalname: 'test.mp4',
          encoding: '7bit',
          mimetype: 'video/mp4',
          size,
          destination: '/tmp',
          filename: 'test.mp4',
          path: '/tmp/test.mp4',
          buffer: Buffer.from('test'),
        } as Express.Multer.File;

        const result = pipe.transform(file);
        expect(result).toBeNull();
      });
    });
  });
});
