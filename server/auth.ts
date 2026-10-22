import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import secureSession from '@fastify/secure-session';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from './config.js';
const derive = promisify(scrypt);
declare module '@fastify/secure-session' { interface SessionData { operator: string } }
export async function registerAuth(app: FastifyInstance, config: Config) {
  const operator = createHash('sha256').update(config.passwordHash).digest('hex');
  await app.register(secureSession, { key: config.sessionKey, cookieName: 'payment_ui_session', expiry: 8 * 3600,
    cookie: { path: '/', httpOnly: true, sameSite: 'strict', secure: config.publicUrl.startsWith('https:'), maxAge: 8 * 3600 } });
  const authenticated = (request: FastifyRequest) => request.session.get('operator') === operator;
  app.post('/auth/login', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { password } = z.object({ password: z.string().min(1).max(512) }).strict().parse(request.body);
    const [salt, expected] = config.passwordHash.split(':') as [string, string];
    const actual = await derive(password, salt, 64) as Buffer;
    if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) return reply.code(401).send({ error: { message: 'Incorrect password' } });
    request.session.regenerate(); request.session.set('operator', operator);
    return { authenticated: true };
  });
  app.post('/auth/logout', async request => { request.session.delete(); return { authenticated: false }; });
  app.get('/auth/session', async (request, reply) => authenticated(request)
    ? { authenticated: true } : reply.code(401).send({ error: { message: 'Sign in to the dashboard' } }));
  return authenticated;
}
