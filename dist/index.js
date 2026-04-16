import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { apiRoutes } from './api/routes.js';
import { setupBot } from './bot/index.js';
import { logger } from './utils/logger.js';
import { env } from 'process';
import dotenv from 'dotenv';
dotenv.config();
const fastify = Fastify({
    logger: logger
});
fastify.register(fastifyWebsocket);
fastify.register(apiRoutes, { prefix: '/api' });
const start = async () => {
    try {
        const port = Number(env.PORT) || 3000;
        const host = env.HOST || '0.0.0.0';
        await fastify.listen({ port, host });
        logger.info(`API server listening on http://${host}:${port}`);
        const bot = setupBot();
        // Start bot in long-polling mode (can be changed to webhook later)
        bot.launch(() => {
            logger.info('Telegram bot started successfully');
        });
        // Handle graceful shutdown
        process.once('SIGINT', () => {
            bot.stop('SIGINT');
            fastify.close();
        });
        process.once('SIGTERM', () => {
            bot.stop('SIGTERM');
            fastify.close();
        });
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
