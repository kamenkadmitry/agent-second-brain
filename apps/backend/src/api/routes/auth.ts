import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { conflict, unauthorized, badRequest } from '../../utils/errors.js';

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request) => {
    const parsed = CredentialsSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid credentials payload', parsed.error.issues);
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict('User already exists');

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, settings: { create: {} } },
    });
    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' });
    return { token, user: { id: user.id, email: user.email } };
  });

  app.post('/login', async (request) => {
    const parsed = CredentialsSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Invalid credentials payload', parsed.error.issues);
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw unauthorized('Invalid credentials');

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' });
    return { token, user: { id: user.id, email: user.email } };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId! },
      select: { id: true, email: true, createdAt: true },
    });
    return { user };
  });
}
