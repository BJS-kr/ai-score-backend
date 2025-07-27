import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import '@azure/openai/types';
import { StrictReturn } from '../../helper/stricter/strict.return';
import { EssayEvaluation } from '../respositories/score.respository';

type RawReviewResponse = {
  reviewPrompt: string;
  reviewResponse: string;
};

@Injectable()
export class AzureOpenAIIntegration {
  private readonly openAIClient: AzureOpenAI;
  private readonly deploymentName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('AZURE_ENDPOINT_URL');
    const apiKey = this.configService.get<string>('AZURE_ENDPOINT_KEY');
    const apiVersion =
      this.configService.get<string>('OPENAI_API_VERSION') || '';
    this.deploymentName =
      this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME') || '';

    if (!apiKey || !this.deploymentName || !endpoint || !apiVersion) {
      throw new Error('Azure OpenAI configuration is missing');
    }

    this.openAIClient = new AzureOpenAI({
      endpoint,
      apiKey,
      deployment: this.deploymentName,
      apiVersion,
    });
  }

  async getRawReviewResponse(
    reviewPrompt: string,
  ): Promise<StrictReturn<RawReviewResponse | null>> {
    const responseResult = await this.callAzureOpenAI(reviewPrompt);

    if (!responseResult.success) {
      return {
        success: false,
        error: responseResult.error,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        reviewResponse: responseResult.data,
        reviewPrompt: reviewPrompt,
      },
    };
  }

  private async callAzureOpenAI(prompt: string): Promise<StrictReturn<string>> {
    const response = await this.openAIClient.chat.completions.create({
      model: '',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      return {
        success: false,
        error: 'No response from Azure OpenAI',
        data: '',
      };
    }

    const content = response.choices[0].message?.content;
    if (!content) {
      return {
        success: false,
        error: 'Empty response content from Azure OpenAI',
        data: '',
      };
    }

    return {
      success: true,
      data: content,
    };
  }

  parseAndValidateResponse(
    content: string,
  ): StrictReturn<EssayEvaluation | null> {
    try {
      const trimmedContent = this.trimJsonAnnotationIfExists(content);
      const evaluation: EssayEvaluation = JSON.parse(
        trimmedContent,
      ) as EssayEvaluation;

      if (!this.isValidEvaluation(evaluation)) {
        return {
          success: false,
          error: 'Invalid response format',
          data: null,
        };
      }

      // Ensure highlights are strings
      const validHighlights = evaluation.highlights.filter(
        (highlight) => typeof highlight === 'string' && highlight.trim(),
      );

      return {
        success: true,
        data: {
          score: Math.round(evaluation.score),
          feedback: evaluation.feedback.trim(),
          highlights: validHighlights,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);

      return {
        success: false,
        error: `Response parsing failed: ${errorMessage}`,
        data: null,
      };
    }
  }

  private isValidEvaluation(value: EssayEvaluation): value is EssayEvaluation {
    if (!value) {
      return false;
    }

    if (typeof value.score !== 'number') {
      return false;
    }

    if (value.score < 0 || value.score > 10) {
      return false;
    }

    if (typeof value.feedback !== 'string' || !value.feedback.trim()) {
      return false;
    }

    if (!Array.isArray(value.highlights)) {
      return false;
    }

    return true;
  }

  private trimJsonAnnotationIfExists(content: string): string {
    const trimmed = content.trim();
    const jsonBlockRegex = /^```json\s*([\s\S]*?)\s*```$/;
    const match = trimmed.match(jsonBlockRegex);
    if (match) {
      return match[1].trim();
    }
    return trimmed;
  }
}
