import { logger } from '../utils/logger.js';
import { env } from 'process';
export class DeepgramService {
    apiKey;
    constructor() {
        const key = env.DEEPGRAM_API_KEY;
        if (!key) {
            logger.error('DEEPGRAM_API_KEY is not set');
            throw new Error('DEEPGRAM_API_KEY is required but missing from environment variables');
        }
        this.apiKey = key;
    }
    async transcribeAudio(audioBuffer, mimetype) {
        logger.info({ mimetype, size: audioBuffer.length }, 'Starting audio transcription with Deepgram');
        const url = 'https://api.deepgram.com/v1/listen?smart_format=true&language=ru&model=nova-2';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${this.apiKey}`,
                'Content-Type': mimetype,
            },
            // Pass as ArrayBuffer
            body: new Blob([new Uint8Array(audioBuffer)], { type: mimetype }),
        });
        if (!response.ok) {
            const errText = await response.text().catch(() => 'Failed to read error response');
            logger.error({ status: response.status, error: errText }, 'Deepgram API error');
            throw new Error(`Deepgram transcription failed: ${response.statusText}`);
        }
        const data = await response.json();
        // Deepgram response structure check
        if (!data.results?.channels?.[0]?.alternatives?.[0]) {
            logger.error({ data }, 'Unexpected Deepgram response structure');
            throw new Error('Invalid response structure from Deepgram');
        }
        const transcript = data.results.channels[0].alternatives[0].transcript;
        if (!transcript) {
            logger.warn('Deepgram returned an empty transcript');
        }
        else {
            logger.info('Deepgram transcription successful');
        }
        return transcript;
    }
}
export const deepgramService = new DeepgramService();
