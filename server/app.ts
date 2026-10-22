import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { ZodError } from 'zod';
import { resolve } from 'node:path';
import type { Config } from './config.js';
import { registerAuth } from './auth.js';
import { registerCheckoutProxy, registerMerchantProxy } from './proxy.js';
export async function buildApp(config: Config, webRoot = resolve('dist/web')) {
  const app = Fastify({ logger: false, bodyLimit: 4096, requestTimeout: 20000, connectionTimeout: 10000 });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute', cache: 10000 });
  app.addHook('onRequest', async (request, reply) => {
    if (request.headers.host !== new URL(config.publicUrl).host) return reply.code(421).send({ error: { message: 'Unexpected host' } });
    const origin = request.headers.origin;
    if ((origin && origin !== config.publicUrl) || (request.method === 'POST' && origin !== config.publicUrl))
      return reply.code(403).send({ error: { message: 'Same-origin request required' } });
  });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer')
      .header('X-Content-Type-Options', 'nosniff').header('X-Frame-Options', 'DENY')
      .header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://mainnet.base.org https://sepolia.base.org; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: { message: 'Invalid request fields' } });
    const status = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    return reply.code(status).send({ error: { message: status === 429 ? 'Too many requests. Try again later.' : 'Request could not be completed' } });
  });
  const authenticated = await registerAuth(app, config);
  registerCheckoutProxy(app, config);
  await registerMerchantProxy(app, config, authenticated);
  app.get('/', async (_request, reply) => reply.redirect('/dashboard/'));
  await app.register(staticFiles, { root: webRoot, prefix: '/', index: ['index.html'], dotfiles: 'deny' });
  return app;
}
