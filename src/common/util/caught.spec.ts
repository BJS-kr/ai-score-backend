import { caught } from './caught';

describe('caught', () => {
  it('should return the result when promise resolves successfully', async () => {
    // Arrange
    const successPromise = Promise.resolve('success');

    // Act
    const result = await caught(successPromise);

    // Assert
    expect(result).toBe('success');
  });

  it('should return Error instance when promise rejects with Error', async () => {
    // Arrange
    const error = new Error('Test error');
    const errorPromise = Promise.reject(error);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect(result).toBe(error);
    expect((result as Error).message).toBe('Test error');
  });

  it('should return Error instance when promise rejects with non-Error', async () => {
    // Arrange
    const nonError = 'string error';
    const errorPromise = Promise.reject(nonError);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('"string error"');
  });

  it('should return Error instance when promise rejects with object', async () => {
    // Arrange
    const objectError = { code: 500, message: 'Server error' };
    const errorPromise = Promise.reject(objectError);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe(
      '{"code":500,"message":"Server error"}',
    );
  });

  it('should return Error instance when promise rejects with null', async () => {
    // Arrange
    const errorPromise = Promise.reject(null);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('null');
  });

  it('should return Error instance when promise rejects with undefined', async () => {
    // Arrange
    const errorPromise = Promise.reject(undefined);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('');
  });

  it('should return Error instance when promise rejects with number', async () => {
    // Arrange
    const errorPromise = Promise.reject(404);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('404');
  });

  it('should return Error instance when promise rejects with boolean', async () => {
    // Arrange
    const errorPromise = Promise.reject(false);

    // Act
    const result = await caught(errorPromise);

    // Assert
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('false');
  });
});
