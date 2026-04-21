import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { MemoryTier } from '@prisma/client';

const CreateSchema = z.object({
  content: z.string().min(1),
  summary: z.string().optional(),
  tier: z.nativeEnum(MemoryTier).default('Active'),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

const UpdateSchema = z.object({
  content: z.string().optional(),
  summary: z.string().nullable().optional(),
  tier: z.nativeEnum(MemoryTier).optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  touch: z.boolean().optional(),
});

export async function memoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const memories = await prisma.memory.findMany({
      where: { userId: request.userId! },
      include: { tags: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return { memories };
  });

  app.post('/', async (request) => {
    const parsed = CreateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid memory payload', parsed.error.issues);
    const { content, summary, tier, tags } = parsed.data;

    const tagIds: { id: string }[] = [];
    for (const name of tags) {
      const t = await prisma.tag.upsert({ where: { name: name.trim().toLowerCase() }, update: {}, create: { name: name.trim().toLowerCase() } });
      tagIds.push({ id: t.id });
    }
    const memory = await prisma.memory.create({
      data: {
        userId: request.userId!,
        content,
        summary,
        tier,
        decayScore: 100,
        lastAccessed: new Date(),
        tags: { connect: tagIds },
      },
      include: { tags: true },
    });
    return { memory };
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid memory payload', parsed.error.issues);
    const existing = await prisma.memory.findFirst({ where: { id, userId: request.userId! } });
    if (!existing) throw notFound('Memory not found');

    const data: Record<string, unknown> = {};
    if (parsed.data.content !== undefined) data.content = parsed.data.content;
    if (parsed.data.summary !== undefined) data.summary = parsed.data.summary;
    if (parsed.data.tier !== undefined) data.tier = parsed.data.tier;
    if (parsed.data.touch) {
      data.lastAccessed = new Date();
      data.decayScore = 100;
    }
    if (parsed.data.tags) {
      const connects: { id: string }[] = [];
      for (const name of parsed.data.tags) {
        const t = await prisma.tag.upsert({ where: { name: name.trim().toLowerCase() }, update: {}, create: { name: name.trim().toLowerCase() } });
        connects.push({ id: t.id });
      }
      data.tags = { set: connects };
    }

    const memory = await prisma.memory.update({ where: { id }, data, include: { tags: true } });
    return { memory };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.memory.findFirst({ where: { id, userId: request.userId! } });
    if (!existing) throw notFound('Memory not found');
    await prisma.memory.delete({ where: { id } });
    return { ok: true };
  });
}
