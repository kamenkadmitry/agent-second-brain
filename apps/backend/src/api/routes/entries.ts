import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { EntryType, Prisma } from '@prisma/client';

const CreateSchema = z.object({
  type: z.nativeEnum(EntryType),
  content: z.string().min(1),
  tags: z.array(z.string().min(1).max(40)).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export async function entryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const entries = await prisma.entry.findMany({
      where: { userId: request.userId! },
      include: { tags: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { entries };
  });

  app.post('/', async (request) => {
    const parsed = CreateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid entry payload', parsed.error.issues);
    const { type, content, tags, metadata } = parsed.data;

    const tagIds: { id: string }[] = [];
    for (const name of tags) {
      const normalized = name.trim().toLowerCase();
      const t = await prisma.tag.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      });
      tagIds.push({ id: t.id });
    }

    const entry = await prisma.entry.create({
      data: {
        userId: request.userId!,
        type,
        content,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        tags: { connect: tagIds },
      },
      include: { tags: true },
    });
    return { entry };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.entry.findFirst({ where: { id, userId: request.userId! } });
    if (!existing) throw notFound('Entry not found');
    await prisma.entry.delete({ where: { id } });
    return { ok: true };
  });
}
