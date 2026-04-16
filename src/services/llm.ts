import { generateObject, generateText, CoreMessage, tool } from 'ai';
import { openai } from '@ai-sdk/openai'; // Note: Vercel AI SDK handles other providers similarly, we can configure this via env
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { env } from 'process';

export class LLMService {
  private model: any;

  constructor() {
    // Determine provider based on env. For simplicity, we use openai provider but allow model override
    const modelName = env.LLM_MODEL || 'gpt-4o';

    // In a real multi-provider setup, we'd check env.LLM_PROVIDER to switch between anthropic, openai, ollama, etc.
    // For now, we assume OpenAI-compatible API (which Ollama and others can provide).

    // Explicitly fail if no API key is provided and we are using OpenAI provider.
    if (!env.OPENAI_API_KEY) {
        logger.error('OPENAI_API_KEY is not set');
        throw new Error('OPENAI_API_KEY is required for LLM service');
    }

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
