import { z } from 'zod';

/**
 * Strict Telegram update parser. Only the fields we actually consume.
 * Fail-fast: if the payload is not shaped like a valid Telegram update, we reject.
 */

const FromSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string().optional(),
});

const VoiceSchema = z.object({
  file_id: z.string(),
  mime_type: z.string().optional(),
  duration: z.number().optional(),
});

const PhotoSizeSchema = z.object({
  file_id: z.string(),
  width: z.number(),
  height: z.number(),
});

const MessageSchema = z.object({
  message_id: z.number(),
  date: z.number(),
  from: FromSchema.optional(),
  chat: z.object({ id: z.number() }),
  text: z.string().optional(),
  caption: z.string().optional(),
  voice: VoiceSchema.optional(),
  photo: z.array(PhotoSizeSchema).optional(),
  forward_from: FromSchema.optional(),
  forward_from_chat: z.object({ id: z.number(), title: z.string().optional() }).optional(),
});

const UpdateSchema = z.object({
  update_id: z.number(),
  message: MessageSchema.optional(),
  edited_message: MessageSchema.optional(),
  channel_post: MessageSchema.optional(),
});

export type TelegramUpdate = z.infer<typeof UpdateSchema>;
export type TelegramMessage = z.infer<typeof MessageSchema>;

export type ParsedIntentKind = 'text' | 'voice' | 'photo' | 'forward';

export interface ParsedIntent {
  kind: ParsedIntentKind;
  text?: string;
  voiceFileId?: string;
  photoFileId?: string;
  isForward: boolean;
  messageId: number;
  chatId: number;
  userId?: number;
}

/** Throws on invalid/unsupported payloads. Never masks missing fields. */
export function parseTelegramUpdate(raw: unknown): ParsedIntent {
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid Telegram update payload: ${parsed.error.issues.map((i) => i.path.join('.') + ':' + i.message).join('; ')}`);
  }
  const update = parsed.data;
  const msg = update.message ?? update.edited_message ?? update.channel_post;
  if (!msg) {
    throw new Error('Telegram update contains no supported message');
  }

  const isForward = Boolean(msg.forward_from || msg.forward_from_chat);

  if (msg.voice) {
    return {
      kind: 'voice',
      voiceFileId: msg.voice.file_id,
      isForward,
      messageId: msg.message_id,
      chatId: msg.chat.id,
      userId: msg.from?.id,
    };
  }
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    return {
      kind: 'photo',
      photoFileId: largest.file_id,
      text: msg.caption,
      isForward,
      messageId: msg.message_id,
      chatId: msg.chat.id,
      userId: msg.from?.id,
    };
  }
  const text = msg.text ?? msg.caption;
  if (text && text.trim().length > 0) {
    return {
      kind: isForward ? 'forward' : 'text',
      text,
      isForward,
      messageId: msg.message_id,
      chatId: msg.chat.id,
      userId: msg.from?.id,
    };
  }
  throw new Error('Telegram message has no text / voice / photo content');
}
