import { validate } from 'class-validator';
import {
  SubmissionRequestDto,
  SubmissionRequestSchema,
} from './submission.request.dto';

describe('SubmissionRequestDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when studentId is missing', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });

    it('should fail validation when studentId is not a valid UUID', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = 'invalid-uuid';
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });

    it('should fail validation when studentName is missing', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when studentName is not a string', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 123 as unknown as string;
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when componentType is missing', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when componentType is not a string', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.componentType = 123 as unknown as string;
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when submitText is missing', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when submitText is not a string', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';
      dto.submitText = 123 as unknown as string;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should pass validation with different component types', async () => {
      // Arrange
      const componentTypes = ['essay', 'presentation', 'report', 'analysis'];

      for (const componentType of componentTypes) {
        const dto = new SubmissionRequestDto();
        dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
        dto.studentName = 'John Doe';
        dto.componentType = componentType;
        dto.submitText = 'This is a test submission.';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle special characters in text', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';
      dto.submitText =
        'This is a test essay with special characters: & < > " \' and numbers: 123.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode characters in text', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'John Doe';
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay with unicode: 你好世界 🌍 émojis';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle empty strings for text fields', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = '';
      dto.componentType = '';
      dto.submitText = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0); // Empty strings are valid for @IsString()
    });

    it('should handle very long student names', async () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      dto.studentId = '123e4567-e89b-12d3-a456-426614174000';
      dto.studentName = 'A'.repeat(255); // Very long name
      dto.componentType = 'essay';
      dto.submitText = 'This is a test essay submission.';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle different UUID formats', async () => {
      // Arrange
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      for (const uuid of validUuids) {
        const dto = new SubmissionRequestDto();
        dto.studentId = uuid;
        dto.studentName = 'John Doe';
        dto.componentType = 'essay';
        dto.submitText = 'This is a test essay submission.';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('property access', () => {
    it('should allow setting and getting properties', () => {
      // Arrange
      const dto = new SubmissionRequestDto();
      const studentId = '123e4567-e89b-12d3-a456-426614174000';
      const studentName = 'John Doe';
      const componentType = 'essay';
      const submitText = 'This is a test essay submission.';

      // Act
      dto.studentId = studentId;
      dto.studentName = studentName;
      dto.componentType = componentType;
      dto.submitText = submitText;

      // Assert
      expect(dto.studentId).toBe(studentId);
      expect(dto.studentName).toBe(studentName);
      expect(dto.componentType).toBe(componentType);
      expect(dto.submitText).toBe(submitText);
    });
  });

  describe('schema', () => {
    it('should have correct schema structure', () => {
      // Import the schema

      // Assert
      expect(SubmissionRequestSchema).toBeDefined();
      expect(SubmissionRequestSchema.studentId).toBeDefined();
      expect(SubmissionRequestSchema.studentName).toBeDefined();
      expect(SubmissionRequestSchema.componentType).toBeDefined();
      expect(SubmissionRequestSchema.submitText).toBeDefined();

      expect(SubmissionRequestSchema.studentId.type).toBe('string');
      expect(SubmissionRequestSchema.studentName.type).toBe('string');
      expect(SubmissionRequestSchema.componentType.type).toBe('string');
      expect(SubmissionRequestSchema.submitText.type).toBe('string');
    });
  });
});
