import { generateObject, generateText, CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { env } from 'process';

export class LLMService {
  private model: any;

  constructor() {
    const modelName = env.LLM_MODEL || 'gpt-4o';
    const apiKey = env.OPENAI_API_KEY || 'dummy'; // Custom endpoints might not need a real key

    // Support custom Base URL for other models using OpenAI-compatible API
    const baseURL = env.BASE_URL_MODEL || env.OPENAI_BASE_URL;

    if (!env.OPENAI_API_KEY && !baseURL) {
        logger.error('OPENAI_API_KEY or BASE_URL_MODEL is not set');
        throw new Error('API Key or custom Base URL is required for LLM service');
    }

    const openai = createOpenAI({
      apiKey,
      baseURL,
    });

    this.model = openai(modelName);
  }

  async processStructured<T>(prompt: string, schema: z.ZodSchema<T>, systemPrompt?: string): Promise<T> {
    logger.info('Calling LLM for structured output');
    try {
      const { object } = await generateObject({
        model: this.model,
        schema,
        system: systemPrompt,
        prompt,
      });
      return object as T;
    } catch (error: any) {
      logger.error({ error: error.message }, 'LLM structured output failed');
      throw error;
    }
  }

  async chat(messages: CoreMessage[], systemPrompt?: string): Promise<string> {
    logger.info({ messageCount: messages.length }, 'Calling LLM for chat completion');
    try {
      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        messages,
      });
      return text;
    } catch (error: any) {
      logger.error({ error: error.message }, 'LLM chat failed');
      throw error;
    }
  }
}

export const createLLMService = () => new LLMService();
