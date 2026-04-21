import Fastify, { FastifyBaseLogger, FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { authenticate } from '../utils/auth.js';
import { HttpError } from '../utils/errors.js';

import { authRoutes } from './routes/auth.js';
import { entryRoutes } from './routes/entries.js';
import { memoryRoutes } from './routes/memories.js';
import { taskRoutes } from './routes/tasks.js';
import { skillRoutes } from './routes/skills.js';
import { settingsRoutes } from './routes/settings.js';
import { tagRoutes } from './routes/tags.js';
import { graphRoutes } from './routes/graph.js';
import { telegramRoutes } from './routes/telegram.js';
import { triggerRoutes } from './routes/trigger.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ loggerInstance: logger as unknown as FastifyBaseLogger });

  await app.register(fastifyCors, {
    origin: [env.FRONTEND_ORIGIN, /^https?:\/\/localhost(:\d+)?$/],
    credentials: true,
  });

  await app.register(fastifyJwt, { secret: env.JWT_SECRET });
  app.decorate('authenticate', authenticate);

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.message, details: err.details });
    }
    if ((err as any).validation) {
      return reply.status(400).send({ error: 'Validation failed', details: (err as any).validation });
    }
    request.log.error({ err }, 'Unhandled error');
    return reply.status(500).send({ error: 'Internal Server Error' });
  });

  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

  await app.register(authRoutes,     { prefix: '/api/auth' });
  await app.register(entryRoutes,    { prefix: '/api/entries' });
  await app.register(memoryRoutes,   { prefix: '/api/memories' });
  await app.register(taskRoutes,     { prefix: '/api/tasks' });
  await app.register(skillRoutes,    { prefix: '/api/skills' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(tagRoutes,      { prefix: '/api/tags' });
  await app.register(graphRoutes,    { prefix: '/api/graph' });
  await app.register(telegramRoutes, { prefix: '/api/telegram' });
  await app.register(triggerRoutes,  { prefix: '/api/trigger' });

  return app;
}
