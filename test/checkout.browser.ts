/** Browser integration with a simulated EIP-1193 wallet; never connects to a user's wallet. */
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { scryptSync, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodeFunctionData, parseAbi, type Hex } from 'viem';
import { buildApp as buildUi } from '../server/app.js';
// Optional cross-repository acceptance test. Production UI imports no core source.
const corePath = resolve(process.env.PAYMENT_CORE_PATH ?? '../payment-core');
const fromCore = (path: string) => import(pathToFileURL(resolve(corePath, path)).href);
const { databaseFixture, FixtureChain, freePort, testConfig } = await fromCore('test/helpers.ts');
const { createPool, initializeDatabase } = await fromCore('src/database.ts');
const { Ledger } = await fromCore('src/ledger.ts');
const { Monitor } = await fromCore('src/monitor.ts');
const { buildApp } = await fromCore('src/api.ts');
const { ObservationWorker } = await fromCore('src/observations.ts');

const database = await databaseFixture();
const pool = createPool(database.url); const config = testConfig(database.url);
const port = await freePort(); const uiPort = await freePort(); const uiUrl = `http://127.0.0.1:${uiPort}`;
config.checkoutUrl = `${uiUrl}/checkout/`;
const chain = new FixtureChain(); const ledger = new Ledger(pool, config, chain);
const monitor = new Monitor(pool, config, chain, ledger);
await initializeDatabase(pool, config);
const app = await buildApp(ledger, monitor); await app.listen({ host: '127.0.0.1', port });
const password = randomBytes(24).toString('base64url'); const salt = randomBytes(16).toString('hex');
const ui = await buildUi({ host: '127.0.0.1', port: uiPort, publicUrl: uiUrl, coreUrl: `http://127.0.0.1:${port}`,
  apiKey: config.apiKey, sessionKey: randomBytes(32), passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex') });
await ui.listen({ host: '127.0.0.1', port: uiPort });
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const errors: string[] = [];
  const installWallet = () => {
    const w = window as unknown as Record<string, any>;
    let connected = sessionStorage.getItem('__testWalletConnected') === 'true'; let chainId = '0x1';
    const callbacks = new Map<string, Set<(...args: unknown[]) => void>>();
    const accounts = ['0x0000000000000000000000000000000000000200'];
    w.__sentTransactions = []; w.__rejectPayment = true; w.__interruptPayment = false;
    const provider = {
      isMetaMask: true,
      on(event: string, callback: (...args: unknown[]) => void) { if (!callbacks.has(event)) callbacks.set(event, new Set()); callbacks.get(event)!.add(callback); },
      removeListener(event: string, callback: (...args: unknown[]) => void) { callbacks.get(event)?.delete(callback); },
      async request({ method, params }: { method: string; params?: any[] }) {
        if (method === 'eth_chainId') return chainId;
        if (method === 'eth_accounts') return connected ? accounts : [];
        if (method === 'eth_requestAccounts') { connected = true; sessionStorage.setItem('__testWalletConnected', 'true'); return accounts; }
        if (method === 'wallet_requestPermissions') { connected = true; sessionStorage.setItem('__testWalletConnected', 'true'); return [{ parentCapability: 'eth_accounts' }]; }
        if (method === 'wallet_revokePermissions') { connected = false; sessionStorage.removeItem('__testWalletConnected'); return null; }
        if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
          chainId = params![0].chainId; callbacks.get('chainChanged')?.forEach(callback => callback(chainId)); return null;
        }
        if (method === 'eth_sendTransaction') {
          if (w.__rejectPayment) throw Object.assign(new Error('User rejected the request'), { code: 4001 });
          w.__sentTransactions.push(params![0]);
          if (w.__interruptPayment) throw new Error('Simulated transport interrupted after submission');
          return '0x' + (w.__sentTransactions.length === 1 ? 'aa' : 'bb').repeat(32);
        }
        if (method === 'eth_getBalance') return '0xde0b6b3a7640000';
        throw Object.assign(new Error(`Unsupported test wallet method: ${method}`), { code: 4200 });
      }
    };
    w.ethereum = provider;
    const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: {
      info: { uuid: 'f11ccbc0-d713-4a33-b935-a02bd78c326f', name: 'Test wallet', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E', rdns: 'test.payment.wallet' }, provider
    } }));
    window.addEventListener('eip6963:requestProvider', announce); announce();
  };
  // tsx preserves nested function names with a helper; include it when serializing this test fixture.
  await context.addInitScript({ content: `globalThis.__name = (fn) => fn; (${installWallet.toString()})();` });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  // The wallet replacement monitor has its own public RPC. Keep browser tests deterministic/offline.
  await context.route(/https:\/\/.*base.*\//, route => route.fulfill({ status: 503, body: 'Test RPC unavailable' }));
  const invoice = await ledger.create({ externalOrderId: 'order-2026-001', amountUnits: '2500000', expiresInSeconds: 3600,
    voucher: { entitlement: { product: 'demo' }, validForSeconds: 3600 } }, randomUUID());
  await page.goto(ledger.merchantView(invoice).checkoutUrl);
  await page.getByRole('tab', { name: 'Transfer manually' }).click();
  await page.getByRole('img', { name: 'USDC payment request QR code' }).waitFor();
  assert.ok(await page.getByText(invoice.recipient, { exact: true }).isVisible());
  await mkdir('.local', { recursive: true });
  await page.screenshot({ path: '.local/checkout-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: '.local/checkout-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: /Test wallet|MetaMask|Injected/ }).first().click();
  await page.getByRole('button', { name: 'Switch network and pay' }).click();
  await page.getByRole('alert').filter({ hasText: 'declined' }).waitFor();
  assert.equal((await ledger.get(invoice.id)).status, 'pending');
  await page.evaluate(() => { (window as unknown as Record<string, any>).__rejectPayment = false; });
  await page.getByRole('button', { name: 'Pay with USDC', exact: true }).click();
  await page.getByRole('button', { name: 'Payment submitted', exact: true }).waitFor();
  const transactions = await page.evaluate(() => (window as unknown as Record<string, any>).__sentTransactions) as Array<{ to: string; data: Hex }>;
  assert.equal(transactions.length, 1); assert.equal(transactions[0]!.to.toLowerCase(), config.route.token.toLowerCase());
  const decoded = decodeFunctionData({ abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']), data: transactions[0]!.data });
  assert.equal(decoded.args[0].toLowerCase(), invoice.recipient); assert.equal(decoded.args[1], 2500000n);
  assert.equal((await ledger.get(invoice.id)).status, 'pending');
  assert.equal(await page.getByRole('heading', { name: 'Payment confirmed' }).count(), 0);
  await page.reload(); await page.getByRole('button', { name: 'Payment submitted', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Payment submitted', exact: true }).isDisabled(), true);
  chain.transactionState = 'failed';
  await page.getByRole('button', { name: 'Retry payment', exact: true }).waitFor({ timeout: 15000 });
  chain.transactionState = 'pending';
  await page.evaluate(() => { (window as unknown as Record<string, any>).__rejectPayment = false; });
  await page.getByRole('button', { name: 'Retry payment', exact: true }).click();
  await page.getByRole('button', { name: 'Payment submitted', exact: true }).waitFor();
  chain.emit(invoice, config); await monitor.tick();
  await page.getByRole('heading', { name: 'Payment confirmed' }).waitFor({ timeout: 15000 });
  const privateReceipt = await ledger.receipt(invoice.id); assert.ok(privateReceipt.voucher?.code);
  assert.equal((await page.textContent('body'))!.includes(privateReceipt.voucher!.code!), false);
  const manual = await ledger.create({ externalOrderId: 'order-2026-002', amountUnits: '1000000', expiresInSeconds: 3600 }, randomUUID());
  await page.goto(ledger.merchantView(manual).checkoutUrl);
  await page.getByText(manual.recipient, { exact: true }).waitFor();
  chain.emit(manual, config); await new ObservationWorker(pool, config, chain).tick();
  await page.getByRole('status').filter({ hasText: 'Payment detected' }).waitFor({ timeout: 15000 });
  assert.equal((await ledger.get(manual.id)).status, 'pending');
  await ledger.exceptions.cancel(manual.id, { actor: 'browser-test', reason: 'Customer cancelled before settlement' }, randomUUID());
  await page.getByRole('heading', { name: 'Payment request cancelled' }).waitFor({ timeout: 15000 });
  const uncertain = await ledger.create({ externalOrderId: 'order-2026-003', amountUnits: '1000000', expiresInSeconds: 3600 }, randomUUID());
  await page.goto(ledger.merchantView(uncertain).checkoutUrl); await page.reload();
  await page.evaluate(() => { const w = window as unknown as Record<string, any>; w.__rejectPayment = false; w.__interruptPayment = true; });
  await page.getByRole('button', { name: /Switch network and pay|Pay with USDC/ }).click();
  await page.getByRole('status').filter({ hasText: 'wallet response was interrupted' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Payment submitted' }).isDisabled(), true);
  await page.reload(); await page.getByRole('status').filter({ hasText: 'wallet response was interrupted' }).waitFor();
  await page.goto(uiUrl + '/dashboard/');
  await page.getByLabel('Dashboard password').waitFor();
  await page.screenshot({ path: '.local/dashboard-login.png', fullPage: true });
  await page.getByLabel('Dashboard password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Invoices', exact: true }).waitFor();
  await page.getByRole('button', { name: invoice.externalOrderId, exact: true }).waitFor();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: '.local/dashboard-list-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: '.local/dashboard-list-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Paid', exact: true }).click();
  await page.getByRole('button', { name: invoice.externalOrderId, exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: manual.externalOrderId, exact: true }).count(), 0);
  await page.getByLabel('External order ID').fill(invoice.externalOrderId);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: invoice.externalOrderId, exact: true }).click();
  await page.getByRole('heading', { name: 'Receipt & voucher' }).waitFor();
  await page.getByText('accepted', { exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Refunds', exact: true }).click();
  await page.getByText('No records found.', { exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Audit history', exact: true }).click();
  await page.getByRole('tab', { name: 'Transfers & reviews', exact: true }).click();
  await page.getByText('accepted', { exact: true }).waitFor();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: '.local/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: '.local/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Webhook deliveries', exact: true }).click();
  await page.getByRole('cell').filter({ hasText: 'payment.paid' }).waitFor();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Service health', exact: true }).click();
  await page.getByText('Available addresses', { exact: true }).waitFor();
  await page.reload(); await page.getByRole('heading', { name: 'Invoices', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Navigation', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Dashboard password').waitFor();
  assert.equal((await context.request.get(uiUrl + '/admin-api/invoices')).status(), 401);
  assert.equal((await context.cookies()).some(c => c.httpOnly && c.name === 'payment_ui_session'), false);
  assert.deepEqual(errors, []);
  console.log('PASS: separate core/UI servers; desktop/mobile checkout and dashboard; wallet recovery; server settlement; voucher privacy; operator sign-in/out; filtered invoices and evidence; webhook deliveries; service health; no browser errors.');
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: '.local/browser-failure.png', fullPage: true }).catch(() => {});
    console.error((await page.locator('body').innerText()).slice(0, 2000));
  }
  throw error;
} finally {
  await browser.close(); await ui.close(); await app.close(); await pool.end(); await database.close();
}
