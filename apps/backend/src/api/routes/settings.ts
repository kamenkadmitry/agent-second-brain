import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { badRequest } from '../../utils/errors.js';

const UpdateSchema = z.object({
  llmBaseUrl: z.string().url().optional(),
  llmApiKey: z.string().min(1).nullable().optional(),
  llmModelName: z.string().min(1).optional(),
  telegramToken: z.string().nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
  deepgramApiKey: z.string().nullable().optional(),
  todoistApiKey: z.string().nullable().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const settings = await prisma.settings.upsert({
      where: { userId: request.userId! },
      update: {},
      create: { userId: request.userId! },
    });
    return { settings: mask(settings) };
  });

  app.patch('/', async (request) => {
    const parsed = UpdateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid settings payload', parsed.error.issues);
    const settings = await prisma.settings.upsert({
      where: { userId: request.userId! },
      update: parsed.data,
      create: { userId: request.userId!, ...parsed.data },
    });
    return { settings: mask(settings) };
  });
}

/** Never return raw API keys to the frontend — only presence indicators. */
function mask(s: { [k: string]: any }) {
  return {
    ...s,
    llmApiKey: s.llmApiKey ? '••••' + s.llmApiKey.slice(-4) : null,
    telegramToken: s.telegramToken ? '••••' + s.telegramToken.slice(-4) : null,
    deepgramApiKey: s.deepgramApiKey ? '••••' + s.deepgramApiKey.slice(-4) : null,
    todoistApiKey: s.todoistApiKey ? '••••' + s.todoistApiKey.slice(-4) : null,
  };
}
