import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { buildApp } from './api/app.js';
import { registerRepeatableDecayJob } from './jobs/queue.js';
import { startWorkers } from './jobs/processors.js';
import { prisma } from './config/prisma.js';

async function main() {
  logger.info({ node: process.version, env: env.NODE_ENV }, 'Booting agent-second-brain backend');

  const app = await buildApp();
  const workers = startWorkers();
  await registerRepeatableDecayJob();

  await app.listen({ port: env.BACKEND_PORT, host: '0.0.0.0' });
  logger.info({ port: env.BACKEND_PORT }, 'HTTP server listening');

  const shutdown = async (signal: string) => {
    logger.warn({ signal }, 'Shutting down');
    try {
      await app.close();
      await workers.ingestWorker.close();
      await workers.decayWorker.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err: err?.message, stack: err?.stack }, 'Fatal boot error');
  process.exit(1);
});
