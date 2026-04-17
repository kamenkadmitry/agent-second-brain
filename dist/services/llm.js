import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { logger } from '../utils/logger.js';
import { env } from 'process';
export class LLMService {
    model;
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
    async processStructured(prompt, schema, systemPrompt) {
        logger.info('Calling LLM for structured output');
        try {
            const { object } = await generateObject({
                model: this.model,
                schema,
                system: systemPrompt,
                prompt,
            });
            return object;
        }
        catch (error) {
            logger.error({ error: error.message }, 'LLM structured output failed');
            throw error;
        }
    }
    async chat(messages, systemPrompt) {
        logger.info({ messageCount: messages.length }, 'Calling LLM for chat completion');
        try {
            const { text } = await generateText({
                model: this.model,
                system: systemPrompt,
                messages,
            });
            return text;
        }
        catch (error) {
            logger.error({ error: error.message }, 'LLM chat failed');
            throw error;
        }
    }
}
export const createLLMService = () => new LLMService();
