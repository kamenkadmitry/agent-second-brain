import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { Prisma } from '@prisma/client';

const CreateSchema = z.object({
  name: z.string().min(1).max(64),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
});

const UpdateSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export async function skillRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => {
    const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
    return { skills };
  });

  app.post('/', async (request) => {
    const parsed = CreateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid skill payload', parsed.error.issues);
    const skill = await prisma.skill.create({
      data: {
        name: parsed.data.name,
        enabled: parsed.data.enabled,
        config: parsed.data.config as Prisma.InputJsonValue,
      },
    });
    return { skill };
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid skill payload', parsed.error.issues);
    const existing = await prisma.skill.findUnique({ where: { id } });
    if (!existing) throw notFound('Skill not found');
    const data: Prisma.SkillUpdateInput = {};
    if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
    if (parsed.data.config !== undefined) data.config = parsed.data.config as Prisma.InputJsonValue;
    const skill = await prisma.skill.update({ where: { id }, data });
    return { skill };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.skill.findUnique({ where: { id } });
    if (!existing) throw notFound('Skill not found');
    await prisma.skill.delete({ where: { id } });
    return { ok: true };
  });
}
