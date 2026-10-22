import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
const config = loadConfig();
// Source lives in server/, compiled code in dist/server/; both resolve to dist/web.
const webRoot = fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? '../dist/web/' : '../web/', import.meta.url));
const app = await buildApp(config, webRoot);
await app.listen({ host: config.host, port: config.port });
console.log('Payment UI listening at ' + config.publicUrl);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close(); });
