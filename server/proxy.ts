/** Explicit read-only routes. No browser-controlled upstream, redirects, or merchant writes. */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from './config.js';
const id = z.uuid();
export async function forward(config: Config, reply: FastifyReply, path: string, authorization: string) {
  try {
    const response = await fetch(config.coreUrl + path, { redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { authorization, accept: 'application/json' } });
    const body: unknown = await response.json();
    return reply.code(response.status).send(body);
  } catch { return reply.code(502).send({ error: { message: 'Payment core is unavailable. Try again shortly.' } }); }
}
export function registerCheckoutProxy(app: FastifyInstance, config: Config) {
  for (const route of ['/v1/checkout/:id', '/v1/checkout/:id/transactions/:hash']) {
    app.get<{ Params: { id: string; hash?: string } }>(route, async (request, reply) => {
      const invoiceId = id.parse(request.params.id);
      const token = request.headers.authorization ?? '';
      if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(token)) return reply.code(401).send({ error: { message: 'Checkout credential required' } });
      const suffix = request.params.hash ? '/transactions/' + z.string().regex(/^0x[0-9a-fA-F]{64}$/).parse(request.params.hash) : '';
      return forward(config, reply, '/v1/checkout/' + invoiceId + suffix, token);
    });
  }
}
export async function registerMerchantProxy(app: FastifyInstance, config: Config, authenticated: (request: FastifyRequest) => boolean) {
  await app.register(async merchant => {
    merchant.addHook('preHandler', async (request, reply) => {
      if (!authenticated(request)) return reply.code(401).send({ error: { message: 'Sign in to the dashboard' } });
    });
    for (const route of ['/invoices', '/invoices/:id', '/invoices/:id/receipt', '/invoices/:id/transfers', '/invoices/:id/refunds', '/invoices/:id/audit', '/events', '/operations/health']) {
      merchant.get<{ Params: { id?: string } }>('/admin-api' + route, async (request, reply) => {
        const path = request.params.id ? route.replace(':id', id.parse(request.params.id)) : route;
        const search = new URL(request.url, config.publicUrl).search;
        return forward(config, reply, '/v1' + path + search, 'Bearer ' + config.apiKey);
      });
    }
  });
}
