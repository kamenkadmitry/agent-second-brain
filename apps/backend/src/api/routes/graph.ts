import type { FastifyInstance } from 'fastify';
import { buildGraphForUser } from '../../services/graph.js';

export async function graphRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const data = await buildGraphForUser(request.userId!);
    return data;
  });
}
