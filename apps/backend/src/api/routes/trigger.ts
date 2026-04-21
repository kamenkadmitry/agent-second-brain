import type { FastifyInstance } from 'fastify';
import { decayQueue, defaultJobOptions } from '../../jobs/queue.js';

export async function triggerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/decay', async (request) => {
    const job = await decayQueue.add(
      'manual-decay',
      { kind: 'manual', userId: request.userId! },
      defaultJobOptions,
    );
    return { ok: true, jobId: job.id };
  });
}
