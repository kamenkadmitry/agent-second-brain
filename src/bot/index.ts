import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { env } from 'process';
import { logger } from '../utils/logger.js';
import { deepgramService } from '../services/deepgram.js';
import { processor } from '../core/processor/processor.js';

export function setupBot(): Telegraf {
    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        logger.error('TELEGRAM_BOT_TOKEN is not set');
        throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    const bot = new Telegraf(token);

    // Filter allowed users if ALLOWED_USER_IDS is set
    bot.use(async (ctx, next) => {
        if (env.ALLOWED_USER_IDS) {
            try {
                const allowedIds: number[] = JSON.parse(env.ALLOWED_USER_IDS);
                if (allowedIds.length > 0 && ctx.from && !allowedIds.includes(ctx.from.id)) {
                    logger.warn({ userId: ctx.from.id }, 'Unauthorized user access attempt');
                    await ctx.reply('Unauthorized access.');
                    return;
                }
            } catch (e) {
                logger.error('Failed to parse ALLOWED_USER_IDS, allowing all');
            }
        }
        await next();
    });

    bot.on(message('text'), async (ctx) => {
        const text = ctx.message.text;
        logger.info({ messageId: ctx.message.message_id }, 'Received text message');

        try {
            await ctx.reply('Processing...');
            await processor.processInput(text, 'text');
            await ctx.reply('Processed successfully.');
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to process text message');
            // Explicit error to user as per fail-fast rule
            await ctx.reply(`Error during processing: ${error.message}`);
        }
    });

    bot.on(message('voice'), async (ctx) => {
        logger.info({ messageId: ctx.message.message_id }, 'Received voice message');
        try {
            await ctx.reply('Transcribing...');

            const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);

            // Fetch audio directly
            const response = await fetch(fileLink.toString());
            if (!response.ok) {
                throw new Error(`Failed to download voice message: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Transcribe (fail-fast within service)
            const transcript = await deepgramService.transcribeAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg');

            await ctx.reply(`Transcription: ${transcript}\n\nProcessing intent...`);

            // Process
            await processor.processInput(transcript, 'voice');

            await ctx.reply('Processed successfully.');
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to process voice message');
            // Explicit error to user
            await ctx.reply(`Error during processing voice message: ${error.message}`);
        }
    });

    bot.catch((err, ctx) => {
        logger.error({ err }, 'Unhandled Telegraf error');
    });

    return bot;
}
