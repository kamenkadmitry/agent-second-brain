import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';

const CreateSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/).optional(),
});

export async function tagRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return { tags };
  });

  app.post('/', async (request) => {
    const parsed = CreateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid tag payload', parsed.error.issues);
    const tag = await prisma.tag.upsert({
      where: { name: parsed.data.name.toLowerCase() },
      update: { color: parsed.data.color },
      create: { name: parsed.data.name.toLowerCase(), color: parsed.data.color },
    });
    return { tag };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) throw notFound('Tag not found');
    await prisma.tag.delete({ where: { id } });
    return { ok: true };
  });
}
