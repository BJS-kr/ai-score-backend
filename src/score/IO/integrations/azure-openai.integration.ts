import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import '@azure/openai/types';
import { StrictReturn } from '../../../internal/stricter/strict.return';
import {
  EssayEvaluation,
  ScoreRepository,
} from '../respositories/score.respository';

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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'No JSON found in response',
          data: null,
        };
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);

      if (!this.isValidEvaluation(jsonResponse)) {
        return {
          success: false,
          error: 'Invalid response format',
          data: null,
        };
      }

      // Validate required fields
      if (typeof jsonResponse.score !== 'number') {
        return {
          success: false,
          error: 'Invalid score in response',
          data: null,
        };
      }

      if (jsonResponse.score < 0 || jsonResponse.score > 10) {
        return {
          success: false,
          error: 'Score must be between 0 and 10',
          data: null,
        };
      }

      if (
        typeof jsonResponse.feedback !== 'string' ||
        !jsonResponse.feedback.trim()
      ) {
        return {
          success: false,
          error: 'Invalid feedback in response',
          data: null,
        };
      }

      if (!Array.isArray(jsonResponse.highlights)) {
        return {
          success: false,
          error: 'Invalid highlights in response',
          data: null,
        };
      }

      // Ensure highlights are strings
      const validHighlights = jsonResponse.highlights.filter(
        (highlight) => typeof highlight === 'string' && highlight.trim(),
      );

      return {
        success: true,
        data: {
          score: Math.round(jsonResponse.score),
          feedback: jsonResponse.feedback.trim(),
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

  private isValidEvaluation(value: any): value is EssayEvaluation {
    return (
      value &&
      typeof value.score === 'number' &&
      typeof value.feedback === 'string' &&
      Array.isArray(value.highlights)
    );
  }
}
