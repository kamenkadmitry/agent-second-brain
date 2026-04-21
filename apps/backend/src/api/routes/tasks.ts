import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { TaskStatus } from '@prisma/client';

const CreateSchema = z.object({
  content: z.string().min(1),
  isUrgent: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  status: z.nativeEnum(TaskStatus).default('pending'),
  dueAt: z.string().datetime().optional(),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

const UpdateSchema = z.object({
  content: z.string().optional(),
  isUrgent: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

export async function taskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const tasks = await prisma.task.findMany({
      where: { userId: request.userId! },
      include: { tags: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return { tasks };
  });

  app.post('/', async (request) => {
    const parsed = CreateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid task payload', parsed.error.issues);
    const { content, isUrgent, isImportant, status, dueAt, tags } = parsed.data;

    const tagIds: { id: string }[] = [];
    for (const name of tags) {
      const t = await prisma.tag.upsert({ where: { name: name.trim().toLowerCase() }, update: {}, create: { name: name.trim().toLowerCase() } });
      tagIds.push({ id: t.id });
    }

    const task = await prisma.task.create({
      data: {
        userId: request.userId!,
        content,
        isUrgent,
        isImportant,
        status,
        dueAt: dueAt ? new Date(dueAt) : null,
        tags: { connect: tagIds },
      },
      include: { tags: true },
    });
    return { task };
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid task payload', parsed.error.issues);
    const existing = await prisma.task.findFirst({ where: { id, userId: request.userId! } });
    if (!existing) throw notFound('Task not found');

    const data: Record<string, unknown> = {};
    if (parsed.data.content !== undefined) data.content = parsed.data.content;
    if (parsed.data.isUrgent !== undefined) data.isUrgent = parsed.data.isUrgent;
    if (parsed.data.isImportant !== undefined) data.isImportant = parsed.data.isImportant;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.dueAt !== undefined) data.dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
    if (parsed.data.tags) {
      const connects: { id: string }[] = [];
      for (const name of parsed.data.tags) {
        const t = await prisma.tag.upsert({ where: { name: name.trim().toLowerCase() }, update: {}, create: { name: name.trim().toLowerCase() } });
        connects.push({ id: t.id });
      }
      data.tags = { set: connects };
    }

    const task = await prisma.task.update({ where: { id }, data, include: { tags: true } });
    return { task };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findFirst({ where: { id, userId: request.userId! } });
    if (!existing) throw notFound('Task not found');
    await prisma.task.delete({ where: { id } });
    return { ok: true };
  });
}
