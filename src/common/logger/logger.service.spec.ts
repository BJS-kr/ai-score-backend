import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all logging methods', () => {
    expect(typeof service.info).toBe('function');
    expect(typeof service.error).toBe('function');
    expect(typeof service.warn).toBe('function');
    expect(typeof service.debug).toBe('function');
    expect(typeof service.trace).toBe('function');
  });

  // Test the actual logging methods to ensure they don't throw errors
  it('should call info method without throwing', () => {
    expect(() => service.info('Test info message')).not.toThrow();
  });

  it('should call info method with context without throwing', () => {
    expect(() =>
      service.info('Test info message', 'TestContext'),
    ).not.toThrow();
  });

  it('should call info method with context and meta without throwing', () => {
    const meta = { userId: '123', action: 'login' };
    expect(() =>
      service.info('Test info message', 'TestContext', meta),
    ).not.toThrow();
  });

  it('should call error method without throwing', () => {
    expect(() => service.error('Test error message')).not.toThrow();
  });

  it('should call error method with error object without throwing', () => {
    const error = new Error('Test error');
    expect(() => service.error('Test error message', error)).not.toThrow();
  });

  it('should call error method with context and meta without throwing', () => {
    const error = new Error('Test error');
    const meta = { userId: '123' };
    expect(() =>
      service.error('Test error message', error, 'ErrorContext', meta),
    ).not.toThrow();
  });

  it('should call warn method without throwing', () => {
    expect(() =>
      service.warn('Test warn message', 'WarnContext'),
    ).not.toThrow();
  });

  it('should call debug method without throwing', () => {
    expect(() =>
      service.debug('Test debug message', 'DebugContext'),
    ).not.toThrow();
  });

  it('should call trace method without throwing', () => {
    expect(() =>
      service.trace('Test trace message', 'TraceContext'),
    ).not.toThrow();
  });
});
