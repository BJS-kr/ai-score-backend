import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { StrictReturn } from '../../helper/processor/strict.return';
import { LoggerService } from 'src/common/logger/logger.service';
import { LogContext } from 'src/common/decorators/param/log.context';
import { ExternalCallLogRepository } from '../respositories/external.call.log.repository';
import { CONTEXT, ERROR_MESSAGE, TASK_NAME } from './constant';
import { ExternalLogger } from 'src/score/helper/external-logger/external.logger';
import '@azure/openai/types';

type RawReviewResponse = {
  reviewPrompt: string;
  reviewResponse: string;
};

@Injectable()
export class AzureOpenAIIntegration implements OnModuleInit {
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
    const responseResult = await this.callAzureOpenAI(reviewPrompt, logContext);

    if (!responseResult.success) {
      return {
        success: false,
        error: responseResult.error || 'Failed to get raw review response',
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

  private async callAzureOpenAI(
    prompt: string,
    logContext: LogContext,
  ): Promise<StrictReturn<string>> {
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
      data: content,
    };
  }
}
