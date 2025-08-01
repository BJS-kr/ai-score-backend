import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import {
  isSuccess,
  StrictReturn,
} from '../../../helper/processor/strict.return';
import { LoggerService } from 'src/common/logger/logger.service';
import { LogContext } from 'src/common/decorators/param/log-context/log.context';
import { CONTEXT, ERROR_MESSAGE, TASK_NAME } from '../integration.constants';
import { ExternalLogger } from 'src/score/helper/external-logger/external.logger';
import '@azure/openai/types';
import { ChatCompletion } from 'openai/resources/index';

type RawReviewResponse = {
  reviewPrompt: string;
  reviewResponse: string;
};

@Injectable()
export class AzureOpenAIService implements OnModuleInit {
  private openAIClient: AzureOpenAI;
  private deploymentName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly externalLogger: ExternalLogger,
  ) {}

  onModuleInit() {
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
    logContext: LogContext,
  ): Promise<StrictReturn<RawReviewResponse>> {
    const { response, latency } = await this.callAzureOpenAI(reviewPrompt);

    if (response instanceof Error) {
      this.logger.error(
        'Error calling Azure OpenAI',
        response,
        CONTEXT.AZURE_OPENAI,
      );

      return {
        success: false,
        error: response.message,
      };
    }

    const contentResult = await this.getContent(response, logContext, latency);

    if (!isSuccess(contentResult)) {
      return contentResult;
    }

    await this.externalLogger.logExternalCall(
      logContext,
      latency,
      true,
      CONTEXT.AZURE_OPENAI,
      TASK_NAME.AZURE_OPENAI_REVIEW,
      'Successfully got response from Azure OpenAI',
    );

    return {
      success: true,
      data: {
        reviewPrompt,
        reviewResponse: contentResult.data,
      },
    };
  }

  private async callAzureOpenAI(prompt: string) {
    this.logger.trace(
      'Calling Azure OpenAI with prompt',
      CONTEXT.AZURE_OPENAI,
      {
        prompt,
      },
    );

    const start = Date.now();
    const response = await this.openAIClient.chat.completions.create({
      model: '',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    const latency = Date.now() - start;

    return { response, latency };
  }

  private async getContent(
    response: ChatCompletion,
    logContext: LogContext,
    latency: number,
  ): Promise<StrictReturn<string>> {
    if (!response.choices || response.choices.length === 0) {
      await this.externalLogger.logExternalCall(
        logContext,
        latency,
        false,
        CONTEXT.AZURE_OPENAI,
        TASK_NAME.AZURE_OPENAI_REVIEW,
        ERROR_MESSAGE.AZURE_OPENAI.NO_RESPONSE,
      );

      return {
        success: false,
        error: ERROR_MESSAGE.AZURE_OPENAI.NO_RESPONSE,
      };
    }

    const content = response.choices[0].message?.content;

    if (!content) {
      await this.externalLogger.logExternalCall(
        logContext,
        latency,
        false,
        CONTEXT.AZURE_OPENAI,
        TASK_NAME.AZURE_OPENAI_REVIEW,
        ERROR_MESSAGE.AZURE_OPENAI.EMPTY_RESPONSE,
      );

      return {
        success: false,
        error: ERROR_MESSAGE.AZURE_OPENAI.EMPTY_RESPONSE,
      };
    }

    return {
      success: true,
      data: content,
    };
  }
}
