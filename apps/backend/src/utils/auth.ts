import type { FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized } from './errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as { sub: string; email: string };
    request.userId = payload.sub;
  } catch {
    throw unauthorized('Invalid or missing JWT');
  }
}
