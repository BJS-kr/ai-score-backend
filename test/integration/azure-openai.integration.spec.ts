import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AzureOpenAIIntegration } from '../../src/score/IO/integrations/azure-openai.integration';

describe('AzureOpenAIService Integration', () => {
  let service: AzureOpenAIIntegration;
  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.example',
        }),
      ],
      providers: [AzureOpenAIIntegration, ConfigService],
    }).compile();

    service = module.get<AzureOpenAIIntegration>(AzureOpenAIIntegration);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Essay Evaluation Integration', () => {
    it('should successfully evaluate a good essay', async () => {
      const text = `
          My favorite hobby is reading books. I enjoy reading because it helps me learn new things and explore different worlds. 
          When I read, I can imagine myself in the story and feel like I am part of the adventure. 
          Books also help me improve my vocabulary and writing skills. 
          I usually read for about one hour every day after school. 
          My favorite genres are fantasy and science fiction because they are very exciting and creative.
        `;

      const result = await service.evaluateEssay(text);

      // Verify basic structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(10);
      expect(result.data?.feedback).toBeDefined();
      expect(result.data?.feedback.length).toBeGreaterThan(0);
      expect(Array.isArray(result.data?.highlights)).toBe(true);

      console.log('✅ Good Essay Evaluation Results:', {
        score: result.data?.score,
        feedback: result.data?.feedback.substring(0, 100) + '...',
        highlightsCount: result.data?.highlights.length,
        highlights: result.data?.highlights.slice(0, 3), // Show first 3 highlights
      });
    }, 30000); // 30 second timeout for AI API call

    it('should successfully evaluate an essay with grammar mistakes', async () => {
      const request = `
        My favorite hobby is reading books. I enjoy reading because it helps me learn new things and explore different worlds. 
        When I read, I can imagine myself in the story and feel like I am part of the adventure. 
        Books also help me improve my vocabulary and writing skills. 
        I usually read for about one hour every day after school. 
        My favorite genres are fantasy and science fiction because they are very exciting and creative.
      `;

      const result = await service.evaluateEssay(request);

      // Verify basic structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(10);
      expect(result.data?.feedback).toBeDefined();
      expect(result.data?.feedback.length).toBeGreaterThan(0);
      expect(Array.isArray(result.data?.highlights)).toBe(true);

      // For an essay with grammar mistakes, we expect:
      // - Lower score (likely < 8)
      // - Some highlights pointing to grammar issues
      expect(result.data?.score).toBeLessThan(8);
      expect(result.data?.highlights.length).toBeGreaterThan(0);

      console.log('✅ Grammar Mistakes Essay Evaluation Results:', {
        score: result.data?.score,
        feedback: result.data?.feedback.substring(0, 100) + '...',
        highlightsCount: result.data?.highlights.length,
        highlights: result.data?.highlights.slice(0, 5), // Show first 5 highlights
      });
    }, 30000); // 30 second timeout for AI API call

    it('should successfully evaluate a short essay', async () => {
      const text = 'I like pizza. Pizza is good. I eat pizza every day.';

      const result = await service.evaluateEssay(text);

      // Verify basic structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(10);
      expect(typeof result.data?.feedback).toBe('string');
      expect(result.data?.feedback.length).toBeGreaterThan(0);
      expect(Array.isArray(result.data?.highlights)).toBe(true);

      // For a very short essay, we expect:
      // - Lower score due to lack of development
      // - Feedback about length/development issues
      expect(result.data?.score).toBeLessThan(6);

      console.log('✅ Short Essay Evaluation Results:', {
        score: result.data?.score,
        feedback: result.data?.feedback.substring(0, 100) + '...',
        highlightsCount: result.data?.highlights.length,
        highlights: result.data?.highlights,
      });
    }, 30000); // 30 second timeout for AI API call
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty essay text gracefully', async () => {
      const text = '';

      const result = await service.evaluateEssay(text);

      // Should still return a valid response structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(10);
      expect(typeof result.data?.feedback).toBe('string');
      expect(Array.isArray(result.data?.highlights)).toBe(true);

      // Empty essay should get a very low score
      expect(result.data?.score).toBeLessThanOrEqual(2);

      console.log('✅ Empty Essay Handling:', {
        score: result.data?.score,
        feedback: result.data?.feedback.substring(0, 100) + '...',
      });
    }, 30000);

    it('should handle very long essay text', async () => {
      const longText = 'This is a very long essay. '.repeat(200); // Create a long essay

      const text = longText;

      const result = await service.evaluateEssay(text);

      // Should still return a valid response structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(10);
      expect(typeof result.data?.feedback).toBe('string');
      expect(Array.isArray(result.data?.highlights)).toBe(true);

      console.log('✅ Long Essay Handling:', {
        score: result.data?.score,
        essayLength: longText.length,
        feedback: result.data?.feedback.substring(0, 100) + '...',
      });
    }, 45000); // Longer timeout for processing long text

    it('should handle special characters and non-English text', async () => {
      const text =
        'Hello! My name is José. I like café & résumé. Math: 2 + 2 = 4. Symbols: @#$%^&*()';

      const result = await service.evaluateEssay(text);

      // Should still return a valid response structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(10);
      expect(typeof result.data?.feedback).toBe('string');
      expect(Array.isArray(result.data?.highlights)).toBe(true);

      console.log('✅ Special Characters Handling:', {
        score: result.data?.score,
        feedback: result.data?.feedback.substring(0, 100) + '...',
      });
    }, 30000);
  });
});
