import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface LlmConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export const ClassificationSchema = z.object({
  classification: z.enum(['task', 'idea', 'reflection', 'learning', 'client_mention', 'goal_update', 'unknown']),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  // For tasks
  isUrgent: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  dueHint: z.string().optional(),
  // Entities / tagging
  tags: z.array(z.string()).default([]),
  suggestedAction: z
    .object({
      type: z.enum(['create_task', 'create_memory', 'none']),
      content: z.string().optional(),
    })
    .optional(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

export async function classifyText(input: string, config: LlmConfig): Promise<Classification> {
  if (!config.apiKey) {
    // Fail fast — the webhook handler should have already enforced this.
    throw new Error('LLM API key is not configured');
  }

  const client = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ?? env.LLM_BASE_URL,
  });
  const model = client(config.model ?? env.LLM_MODEL);

  const system = `You are the brain processor for a personal second-brain agent.
Extract structured info from the user's input. Keep summaries short (<= 140 chars).
- "task" → actionable: include isUrgent, isImportant, dueHint if present.
- "idea"/"reflection"/"learning" → store as memory.
- "client_mention" → note about a business contact / client.
- Produce at most 5 short lowercase tags (single-word or kebab-case).`;

  logger.debug({ inputPreview: input.slice(0, 120) }, 'Calling LLM classifier');
  const { object } = await generateObject({
    model,
    schema: ClassificationSchema,
    system,
    prompt: input,
  });
  return object;
}
