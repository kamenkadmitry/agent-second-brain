import { describe, it, expect } from 'vitest';
import { parseTelegramUpdate } from '../src/services/telegram-webhook.js';

describe('telegram webhook parser (fail-fast)', () => {
  it('rejects completely invalid payload', () => {
    expect(() => parseTelegramUpdate({})).toThrow(/Invalid Telegram update/);
    expect(() => parseTelegramUpdate(null)).toThrow();
    expect(() => parseTelegramUpdate('not-json')).toThrow();
  });

  it('rejects update with message but no content', () => {
    expect(() =>
      parseTelegramUpdate({
        update_id: 1,
        message: { message_id: 1, date: 0, chat: { id: 1 } },
      }),
    ).toThrow(/no text \/ voice \/ photo/);
  });

  it('parses text message', () => {
    const r = parseTelegramUpdate({
      update_id: 10,
      message: { message_id: 2, date: 0, chat: { id: 42 }, from: { id: 7 }, text: 'hello' },
    });
    expect(r.kind).toBe('text');
    expect(r.text).toBe('hello');
    expect(r.userId).toBe(7);
    expect(r.chatId).toBe(42);
  });

  it('parses voice message', () => {
    const r = parseTelegramUpdate({
      update_id: 11,
      message: {
        message_id: 3, date: 0, chat: { id: 42 }, from: { id: 7 },
        voice: { file_id: 'f1', mime_type: 'audio/ogg', duration: 3 },
      },
    });
    expect(r.kind).toBe('voice');
    expect(r.voiceFileId).toBe('f1');
  });

  it('parses photo and picks largest size', () => {
    const r = parseTelegramUpdate({
      update_id: 12,
      message: {
        message_id: 4, date: 0, chat: { id: 42 },
        photo: [
          { file_id: 'small', width: 90,  height: 90 },
          { file_id: 'large', width: 640, height: 640 },
        ],
        caption: 'hello',
      },
    });
    expect(r.kind).toBe('photo');
    expect(r.photoFileId).toBe('large');
    expect(r.text).toBe('hello');
  });

  it('marks forwarded messages', () => {
    const r = parseTelegramUpdate({
      update_id: 13,
      message: {
        message_id: 5, date: 0, chat: { id: 42 },
        text: 'forwarded text',
        forward_from: { id: 99 },
      },
    });
    expect(r.kind).toBe('forward');
    expect(r.isForward).toBe(true);
  });
});
