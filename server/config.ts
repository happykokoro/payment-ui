import { z } from 'zod';
const httpUrl = z.url().refine(value => {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash && url.pathname === '/'
    && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
});
const schema = z.object({
  UI_HOST: z.string().default('127.0.0.1'), UI_PORT: z.coerce.number().int().min(1).max(65535).default(4006),
  UI_PUBLIC_URL: httpUrl, CORE_URL: httpUrl,
  CORE_API_KEY: z.string().min(32), UI_SESSION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  DASHBOARD_PASSWORD_HASH: z.string().regex(/^[a-f0-9]{32}:[a-f0-9]{128}$/)
});
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error('Invalid UI configuration fields: ' + parsed.error.issues.map(i => i.path.join('.')).join(', '));
  const e = parsed.data;
  if (e.CORE_API_KEY === e.UI_SESSION_KEY) throw new Error('Core and session keys must differ');
  return { host: e.UI_HOST, port: e.UI_PORT, publicUrl: new URL(e.UI_PUBLIC_URL).origin,
    coreUrl: new URL(e.CORE_URL).origin, apiKey: e.CORE_API_KEY,
    sessionKey: Buffer.from(e.UI_SESSION_KEY, 'hex'), passwordHash: e.DASHBOARD_PASSWORD_HASH };
}
export type Config = ReturnType<typeof loadConfig>;
