import { logger } from '../utils/logger.js';

export interface DeepgramOptions {
  apiKey: string;
  language?: string;
  model?: string;
}

export async function transcribeAudio(
  audio: Buffer,
  mimetype: string,
  opts: DeepgramOptions,
): Promise<string> {
  if (!opts.apiKey) throw new Error('Deepgram API key is not configured');

  const params = new URLSearchParams({
    smart_format: 'true',
    language: opts.language ?? 'ru',
    model: opts.model ?? 'nova-2',
  });
  const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;

  logger.info({ mimetype, size: audio.length }, 'Sending audio to Deepgram');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${opts.apiKey}`,
      'Content-Type': mimetype,
    },
    body: new Uint8Array(audio),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Deepgram request failed: ${response.status} ${response.statusText} ${text}`);
  }

  const data: any = await response.json();
  const transcript: string | undefined = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (transcript === undefined) {
    throw new Error('Deepgram response missing transcript field');
  }
  return transcript;
}

export async function downloadTelegramFile(botToken: string, fileId: string): Promise<{ buffer: Buffer; mimetype: string }> {
  const meta = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  if (!meta.ok) throw new Error(`Failed to get file metadata from Telegram: ${meta.status}`);
  const metaJson: any = await meta.json();
  if (!metaJson?.ok || !metaJson?.result?.file_path) {
    throw new Error(`Malformed getFile response from Telegram: ${JSON.stringify(metaJson)}`);
  }
  const filePath: string = metaJson.result.file_path;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!fileRes.ok) throw new Error(`Failed to download Telegram file: ${fileRes.status}`);
  const ab = await fileRes.arrayBuffer();
  return { buffer: Buffer.from(ab), mimetype: 'audio/ogg' };
}
