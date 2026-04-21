import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { parseTelegramUpdate } from '../../services/telegram-webhook.js';
import { ingestQueue, defaultJobOptions } from '../../jobs/queue.js';
import { prisma } from '../../config/prisma.js';
import { badRequest, unauthorized } from '../../utils/errors.js';

/**
 * Telegram webhook endpoint.
 *
 * Routing: we map an incoming Telegram user id → app User by looking up
 * Settings.telegramChatId. If no match and there is exactly one user in the
 * system (single-user deployment) we route to that user. Otherwise we
 * fail-fast with 403 so the admin is aware.
 */
export async function telegramRoutes(app: FastifyInstance) {
  app.post('/webhook', async (request) => {
    const provided = request.headers['x-telegram-bot-api-secret-token'];
    if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
      // Fail fast — no soft fallback.
      throw unauthorized('Invalid Telegram webhook secret');
    }

    const intent = parseTelegramUpdate(request.body);

    let userId: string | null = null;
    if (intent.userId !== undefined) {
      const settings = await prisma.settings.findFirst({
        where: { telegramChatId: String(intent.userId) },
        select: { userId: true },
      });
      userId = settings?.userId ?? null;
    }
    if (!userId) {
      const users = await prisma.user.findMany({ select: { id: true }, take: 2 });
      if (users.length === 1) userId = users[0].id;
    }
    if (!userId) {
      throw badRequest('No target user for this Telegram update; set Settings.telegramChatId for the user.');
    }

    const job = await ingestQueue.add('telegram-intent', { userId, intent }, defaultJobOptions);
    logger.info({ jobId: job.id, userId, kind: intent.kind }, 'Enqueued ingest job');
    return { ok: true, jobId: job.id };
  });
}
