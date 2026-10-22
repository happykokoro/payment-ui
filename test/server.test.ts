import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import Fastify from 'fastify';
import { randomBytes, scryptSync } from 'node:crypto';
import { buildApp } from '../server/app.js';
import { loadConfig, type Config } from '../server/config.js';
const core = Fastify();
const seen: { url: string; authorization?: string }[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;
let config: Config;
const password = 'test-operator-password-only';
const salt = randomBytes(16).toString('hex');
const authHeaders = { host: '127.0.0.1:4006', origin: 'http://127.0.0.1:4006' };
beforeAll(async () => {
  core.get('/*', async (r, reply) => {
    seen.push({ url: r.url, authorization: r.headers.authorization });
    if (r.url === '/v1/events?redirect=yes') return reply.redirect('https://example.invalid/');
    return { path: r.url, safe: true };
  });
  const coreUrl = await core.listen({ port: 0, host: '127.0.0.1' });
  config = loadConfig({ UI_PUBLIC_URL: authHeaders.origin, CORE_URL: coreUrl, CORE_API_KEY: randomBytes(32).toString('hex'),
    UI_SESSION_KEY: randomBytes(32).toString('hex'), DASHBOARD_PASSWORD_HASH: salt + ':' + scryptSync(password, salt, 64).toString('hex') });
});
beforeEach(async () => { seen.length = 0; if (app) await app.close(); app = await buildApp(config); });
afterAll(async () => { await app?.close(); await core.close(); });
async function login() {
  const response = await app.inject({ method: 'POST', url: '/auth/login', headers: authHeaders, payload: { password } });
  expect(response.statusCode).toBe(200);
  const cookie = String(response.headers['set-cookie']);
  expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict');
  expect(response.body).not.toContain(config.apiKey);
  return cookie.split(';')[0]!;
}
it('denies merchant reads without a session and never forwards the merchant key to public checkout', async () => {
  expect((await app.inject({ url: '/admin-api/invoices', headers: authHeaders })).statusCode).toBe(401);
  expect(seen).toHaveLength(0);
  const token = randomBytes(32).toString('base64url');
  const path = '/v1/checkout/7ee3c248-f55d-486a-a794-717434c10891';
  expect((await app.inject({ url: path, headers: { ...authHeaders, authorization: 'Bearer ' + token } })).statusCode).toBe(200);
  expect(seen).toEqual([{ url: path, authorization: 'Bearer ' + token }]);
});
it('proxies only allowlisted read routes using the server key, retaining filters', async () => {
  const cookie = await login();
  const response = await app.inject({ url: '/admin-api/invoices?status=paid&limit=25', headers: { ...authHeaders, cookie, authorization: 'Bearer browser-value' } });
  expect(response.statusCode).toBe(200);
  expect(seen).toEqual([{ url: '/v1/invoices?status=paid&limit=25', authorization: 'Bearer ' + config.apiKey }]);
  expect(response.body).not.toContain(config.apiKey);
  expect((await app.inject({ method: 'POST', url: '/admin-api/invoices', headers: { ...authHeaders, cookie }, payload: {} })).statusCode).toBe(404);
  expect((await app.inject({ url: '/admin-api/credentials/keys', headers: { ...authHeaders, cookie } })).statusCode).toBe(404);
  expect(seen).toHaveLength(1);
});
it('rejects cross-origin login/logout and unexpected hosts before any forwarding', async () => {
  expect((await app.inject({ method: 'POST', url: '/auth/login', headers: { ...authHeaders, origin: 'https://other.example' }, payload: { password } })).statusCode).toBe(403);
  expect((await app.inject({ method: 'POST', url: '/auth/login', headers: { host: authHeaders.host }, payload: { password } })).statusCode).toBe(403);
  expect((await app.inject({ url: '/auth/session', headers: { host: 'attacker.example' } })).statusCode).toBe(421);
  const cookie = await login();
  expect((await app.inject({ method: 'POST', url: '/auth/logout', headers: { ...authHeaders, cookie, origin: 'https://other.example' }, payload: {} })).statusCode).toBe(403);
  expect((await app.inject({ url: '/auth/session', headers: { ...authHeaders, cookie } })).statusCode).toBe(200);
  expect(seen).toHaveLength(0);
});
it('limits password guessing and handles logout and tampered sessions', async () => {
  const cookie = await login();
  expect((await app.inject({ url: '/auth/session', headers: { ...authHeaders, cookie: cookie + 'broken' } })).statusCode).toBe(401);
  const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: { ...authHeaders, cookie }, payload: {} });
  expect(logout.statusCode).toBe(200);
  expect(String(logout.headers['set-cookie'])).toContain('Max-Age=0');
  for (let attempt = 0; attempt < 4; attempt++) expect((await app.inject({ method: 'POST', url: '/auth/login', headers: authHeaders, payload: { password: 'incorrect' } })).statusCode).toBe(401);
  expect((await app.inject({ method: 'POST', url: '/auth/login', headers: authHeaders, payload: { password } })).statusCode).toBe(429);
});
it('invalidates existing sessions when the operator password hash rotates', async () => {
  const cookie = await login();
  const replacement = await buildApp({ ...config, passwordHash: salt + ':' + scryptSync('replacement', salt, 64).toString('hex') });
  try { expect((await replacement.inject({ url: '/auth/session', headers: { ...authHeaders, cookie } })).statusCode).toBe(401); }
  finally { await replacement.close(); }
});
it('does not follow upstream redirects and reports an unavailable core without exposing configuration', async () => {
  const cookie = await login();
  const response = await app.inject({ url: '/admin-api/events?redirect=yes', headers: { ...authHeaders, cookie } });
  expect(response.statusCode).toBe(502); expect(response.body).not.toContain(config.apiKey);
  expect(response.headers['cache-control']).toBe('no-store');
});
it('rejects insecure remote origins and credential-bearing upstream URLs', () => {
  const env = { UI_PUBLIC_URL: authHeaders.origin, CORE_URL: config.coreUrl, CORE_API_KEY: config.apiKey,
    UI_SESSION_KEY: config.sessionKey.toString('hex'), DASHBOARD_PASSWORD_HASH: config.passwordHash };
  expect(() => loadConfig({ ...env, CORE_URL: 'http://remote.example' })).toThrow();
  expect(() => loadConfig({ ...env, CORE_URL: 'https://key:secret@remote.example' })).toThrow();
  expect(() => loadConfig({ ...env, UI_PUBLIC_URL: 'http://remote.example' })).toThrow();
});
