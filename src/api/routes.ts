import { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { vaultHealth } from '../core/vault-health/vault-health.js';
import { memoryEngine } from '../core/memory-engine/memory-engine.js';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

// Basic emitter for log streaming
export const logEmitter = new EventEmitter();

// We monkey patch process.stdout.write instead to capture pino logs
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk: Uint8Array | string, encodingOrCb?: BufferEncoding | Function, cb?: Function): boolean => {
    logEmitter.emit('log', chunk.toString());
    if (typeof encodingOrCb === 'string') {
        return originalWrite(chunk, encodingOrCb as BufferEncoding, cb as any);
    }
    return originalWrite(chunk, encodingOrCb as any);
};

export async function apiRoutes(fastify: FastifyInstance) {

    fastify.addHook('preHandler', async (request, reply) => {
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            logger.error('API_KEY is not configured in environment variables');
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'API authentication is misconfigured'
            });
        }

        const providedKey = request.headers['x-api-key'];

        if (!providedKey || typeof providedKey !== 'string') {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid or missing API key'
            });
        }

        // Use timingSafeEqual to prevent timing attacks
        const apiKeyBuffer = Buffer.from(apiKey);
        const providedKeyBuffer = Buffer.from(providedKey);

        if (apiKeyBuffer.length !== providedKeyBuffer.length || !timingSafeEqual(apiKeyBuffer, providedKeyBuffer)) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid or missing API key'
            });
        }
    });

    fastify.get('/status', async (request, reply) => {
        try {
            const health = await vaultHealth.analyze();
            return { status: 'ok', health };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to get health status');
            reply.status(500).send({ error: error.message });
        }
    });

    fastify.get('/memory/map', async (request, reply) => {
        try {
            const stats = await memoryEngine.scan();
            return { status: 'ok', stats };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to get memory map');
            reply.status(500).send({ error: error.message });
        }
    });

    fastify.post('/trigger/reflect', async (request, reply) => {
        // Trigger daily reflection/decay logic
        try {
            const results = await memoryEngine.decay(undefined, false);
            return { status: 'ok', message: 'Decay triggered', changed: results.length };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to trigger reflect');
            reply.status(500).send({ error: error.message });
        }
    });

    // WebSocket route for logs
    fastify.get('/logs/stream', { websocket: true }, (connection, req) => {
        const logListener = (msg: string) => {
            connection.socket.send(msg);
        };

        logEmitter.on('log', logListener);

        connection.socket.on('close', () => {
            logEmitter.off('log', logListener);
        });
    });
}
