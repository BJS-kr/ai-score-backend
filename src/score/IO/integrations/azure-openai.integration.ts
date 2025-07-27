import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import '@azure/openai/types';
import { StrictReturn } from '../../helper/processor/strict.return';
import { EssayEvaluation } from '../respositories/score.respository';
import { LoggerService } from 'src/common/logger/logger.service';
import { LogContext } from 'src/common/decorators/param/log.context';
import { SubmissionLogInfo } from 'src/score/core/submission/review.service';
import { ExternalCallLogRepository } from '../respositories/external.call.log.repository';
import { CONTEXT, ERROR_MESSAGES, TASK_NAMES } from './constant';

type RawReviewResponse = {
  reviewPrompt: string;
  reviewResponse: string;
};

@Injectable()
export class AzureOpenAIIntegration {
  private readonly openAIClient: AzureOpenAI;
  private readonly deploymentName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly externalCallLogRepository: ExternalCallLogRepository,
  ) {
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
    logContext: LogContext<SubmissionLogInfo>,
  ): Promise<StrictReturn<RawReviewResponse | null>> {
    const responseResult = await this.callAzureOpenAI(reviewPrompt, logContext);

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

  private async callAzureOpenAI(
    prompt: string,
    logContext: LogContext<SubmissionLogInfo>,
  ): Promise<StrictReturn<string>> {
    this.logger.trace('Calling Azure OpenAI with prompt', 'azure-openai', {
      prompt,
    });

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
      await this.logExternalCall(
        logContext,
        latency,
        false,
        CONTEXT.AZURE_OPENAI,
        TASK_NAMES.AZURE_OPENAI_REVIEW,
        ERROR_MESSAGES.AZURE_OPENAI.NO_RESPONSE,
      );

      return {
        success: false,
        error: ERROR_MESSAGES.AZURE_OPENAI.NO_RESPONSE,
        data: '',
      };
    }

    const content = response.choices[0].message?.content;
    if (!content) {
      await this.logExternalCall(
        logContext,
        latency,
        false,
        CONTEXT.AZURE_OPENAI,
        TASK_NAMES.AZURE_OPENAI_REVIEW,
        ERROR_MESSAGES.AZURE_OPENAI.EMPTY_RESPONSE,
      );

      return {
        success: false,
        error: ERROR_MESSAGES.AZURE_OPENAI.EMPTY_RESPONSE,
        data: '',
      };
    }

    await this.logExternalCall(
      logContext,
      latency,
      true,
      CONTEXT.AZURE_OPENAI,
      TASK_NAMES.AZURE_OPENAI_REVIEW,
      'Successfully got response from Azure OpenAI',
    );

    return {
      success: true,
      data: content,
    };
  }

  private logExternalCall(
    logContext: LogContext<SubmissionLogInfo>,
    latency: number,
    success: boolean,
    context: string,
    taskName: string,
    description: string,
  ) {
    this.logger.trace(description, context);
    return this.externalCallLogRepository.createLog({
      traceId: logContext.traceId,
      context,
      success,
      latency,
      taskName,
      description,
    });
  }
}
