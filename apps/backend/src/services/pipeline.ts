import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { classifyText, Classification } from './llm.js';
import { transcribeAudio, downloadTelegramFile } from './deepgram.js';
import { createTodoistTask } from './todoist.js';
import { ParsedIntent } from './telegram-webhook.js';
import { EntryType, Prisma } from '@prisma/client';

/**
 * Capture -> Parse -> Categorize -> Execute -> Reflect.
 * Returns the created Entry id. Called from BullMQ worker.
 */
export async function runIngestPipeline(userId: string, intent: ParsedIntent): Promise<string> {
  logger.info({ userId, kind: intent.kind }, 'Ingest pipeline start');

  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings) {
    throw new Error(`Settings row missing for user ${userId}`);
  }

  // --- CAPTURE text (possibly via voice transcription) ---
  let text: string;
  if (intent.kind === 'voice') {
    const botToken = settings.telegramToken ?? env.TELEGRAM_BOT_TOKEN;
    const deepgramKey = settings.deepgramApiKey ?? env.DEEPGRAM_API_KEY;
    if (!botToken) throw new Error('Telegram bot token not configured');
    if (!deepgramKey) throw new Error('Deepgram API key not configured');
    if (!intent.voiceFileId) throw new Error('Voice intent missing file_id');
    const { buffer, mimetype } = await downloadTelegramFile(botToken, intent.voiceFileId);
    text = await transcribeAudio(buffer, mimetype, { apiKey: deepgramKey });
  } else if (intent.kind === 'photo') {
    text = intent.text ?? '[photo without caption]';
  } else {
    text = intent.text ?? '';
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Captured text is empty after parsing');
  }

  // --- FIND-OR-CREATE Entry (idempotent across BullMQ retries) ---
  // The webhook job is retried up to `attempts` times on failure. Creating
  // a fresh Entry on every retry would duplicate rows for the same Telegram
  // message. Dedup on (userId, metadata.telegramMessageId).
  const entryType: EntryType =
    intent.kind === 'voice'
      ? 'voice'
      : intent.kind === 'photo'
      ? 'image'
      : intent.kind === 'forward'
      ? 'forward'
      : 'text';

  let entry =
    intent.messageId !== undefined
      ? await prisma.entry.findFirst({
          where: {
            userId,
            metadata: { path: ['telegramMessageId'], equals: intent.messageId },
          },
        })
      : null;

  if (!entry) {
    entry = await prisma.entry.create({
      data: {
        userId,
        type: entryType,
        content: text,
        metadata: {
          telegramMessageId: intent.messageId,
          telegramChatId: intent.chatId,
          telegramUserId: intent.userId,
        },
      },
    });
  } else {
    logger.info(
      { entryId: entry.id, telegramMessageId: intent.messageId },
      'Ingest pipeline reusing existing Entry (retry or duplicate webhook)',
    );
  }

  // NB: each downstream side-effect below (Task create, Memory create, Todoist
  // sync) has its own idempotency guard via GraphEdge rows. We deliberately do
  // NOT short-circuit the whole classify/execute phase on the presence of any
  // 'GENERATED' edge — doing so would permanently skip a failed Todoist sync
  // on retry (see PR #6 review).

  // --- CLASSIFY via LLM ---
  const llmKey = settings.llmApiKey ?? env.OPENAI_API_KEY;
  let classification: Classification | null = null;
  if (llmKey) {
    try {
      classification = await classifyText(text, {
        apiKey: llmKey,
        baseUrl: settings.llmBaseUrl,
        model: settings.llmModelName,
      });
    } catch (err) {
      logger.error({ err: (err as Error).message, entryId: entry.id }, 'LLM classification failed');
      throw err;
    }
  } else {
    logger.warn({ userId }, 'No LLM key configured; skipping classification');
  }

  // --- TAGS upsert + link ---
  if (classification?.tags?.length) {
    for (const tagName of classification.tags) {
      const name = tagName.trim().toLowerCase().slice(0, 40);
      if (!name) continue;
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.entry.update({
        where: { id: entry.id },
        data: { tags: { connect: { id: tag.id } } },
      });
    }
  }

  // --- EXECUTE suggested action ---
  if (classification?.suggestedAction?.type === 'create_task') {
    const content = classification.suggestedAction.content ?? classification.summary;

    // Find-or-create the local Task, keyed by the GENERATED edge anchored on
    // this Entry. On retry the edge already exists, so we reuse the Task row.
    const generatedEdge = await prisma.graphEdge.findFirst({
      where: { sourceType: 'Entry', sourceId: entry.id, targetType: 'Task', relation: 'GENERATED' },
    });
    let taskId: string;
    if (generatedEdge) {
      taskId = generatedEdge.targetId;
      logger.info({ entryId: entry.id, taskId }, 'Reusing previously created Task (retry)');
    } else {
      const task = await prisma.task.create({
        data: {
          userId,
          content,
          isUrgent: classification.isUrgent ?? false,
          isImportant: classification.isImportant ?? false,
          status: 'pending',
        },
      });
      await prisma.graphEdge.create({
        data: { sourceType: 'Entry', sourceId: entry.id, targetType: 'Task', targetId: task.id, relation: 'GENERATED' },
      });
      taskId = task.id;
    }

    // Todoist sync has its own idempotency marker so a failure here can retry
    // without re-creating the local Task (avoiding duplicates) and without
    // being swallowed by the GENERATED-edge guard above.
    const todoistKey = settings.todoistApiKey ?? env.TODOIST_API_KEY;
    if (todoistKey) {
      const alreadySynced = await prisma.graphEdge.count({
        where: { sourceType: 'Task', sourceId: taskId, relation: 'SYNCED_TO_TODOIST' },
      });
      if (alreadySynced === 0) {
        try {
          await createTodoistTask(todoistKey, {
            content,
            description: classification.summary,
            dueString: classification.dueHint,
            priority: classification.isUrgent && classification.isImportant ? 4 : classification.isImportant ? 3 : classification.isUrgent ? 2 : 1,
          });
          await prisma.graphEdge.create({
            data: { sourceType: 'Task', sourceId: taskId, targetType: 'Task', targetId: taskId, relation: 'SYNCED_TO_TODOIST' },
          });
        } catch (err) {
          logger.error({ err: (err as Error).message, taskId }, 'Todoist sync failed');
          // Do not swallow — re-raise so the BullMQ job retries bounded times.
          throw err;
        }
      }
    }
  } else if (classification?.suggestedAction?.type === 'create_memory' || (!classification?.suggestedAction && classification)) {
    const content = classification.suggestedAction?.content ?? text;
    const existingEdge = await prisma.graphEdge.findFirst({
      where: { sourceType: 'Entry', sourceId: entry.id, targetType: 'Memory', relation: 'GENERATED' },
    });
    if (!existingEdge) {
      const memory = await prisma.memory.create({
        data: {
          userId,
          content,
          summary: classification.summary,
          tier: 'Active',
          decayScore: 100,
          lastAccessed: new Date(),
        },
      });
      await prisma.graphEdge.create({
        data: { sourceType: 'Entry', sourceId: entry.id, targetType: 'Memory', targetId: memory.id, relation: 'GENERATED' },
      });
    } else {
      logger.info({ entryId: entry.id, memoryId: existingEdge.targetId }, 'Reusing previously created Memory (retry)');
    }
  }

  // --- REFLECT: log summary ---
  logger.info(
    { entryId: entry.id, classification: classification?.classification, action: classification?.suggestedAction?.type },
    'Ingest pipeline done',
  );
  return entry.id;
}

export const _pipelineTypes: Prisma.EntryCreateInput | undefined = undefined; // forces type import resolution
