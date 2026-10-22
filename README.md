# Payment UI

Optional customer checkout and a small, read-only merchant dashboard for **Payment Core**. This is a separate Git repository with its own `main` branch, dependencies and build. Core remains usable without this UI.

## Included

- Customer checkout: EIP-6963/injected wallet connection, USDC transfer request, manual QR/address payment, confirmation progress and duplicate-submission recovery.
- Merchant dashboard: invoice listing, status filter and exact order-ID search; invoice evidence, voucher state, transfers/reviews, recorded refunds and audit history; webhook deliveries and operational health.
- A small Fastify server serves static assets and proxies allowlisted read APIs. Merchant credentials stay server-side. The dashboard uses a separate operator password and encrypted HttpOnly cookie.

The dashboard is read-only. Create/cancel/review/redeem/refund/retry operations stay in the core API and merchant application. There are no organizations, subscriptions, treasury, fiat pricing, signing keys or mock payment rows in the shipped UI. WalletConnect and additional chains remain outside scope.

## Run locally

Requires Node.js 22.14+ and an independently configured payment-core service.

1. Run `npm ci`.
2. Copy `.env.example` to `.env`.
3. Run `npm run keys`. Save the generated dashboard login password in your password manager; copy only `DASHBOARD_PASSWORD_HASH` and `UI_SESSION_KEY` into `.env`.
4. Set `CORE_URL` to the core service and `CORE_API_KEY` to its merchant `API_KEY`.
5. Set core's `CHECKOUT_URL=http://127.0.0.1:4006/checkout/`. It replaces the old combined prototype's `PUBLIC_URL`.
6. Run `npm run build`, then `npm start`. Open [the local dashboard](http://127.0.0.1:4006/dashboard/).
7. Create an invoice using the core API. Open its returned `checkoutUrl` to use the customer checkout.

Each repository has its own `.env`; no secret belongs in a `VITE_*` variable or the frontend source. The UI needs neither PostgreSQL access nor chain signing keys. During frontend development use `npm run dev:assets` in one terminal and `npm run dev` in another, then reload the browser. All requests continue through the same UI origin.

## Structure

```text
checkout/src/       customer flow, wallet hooks, QR and payment details
dashboard/src/      operator login, pages, tables, API reads
shared/             original Kokoro Pay v2 UI components, theme and utilities
server/            configuration, sessions, explicit core proxies, static files
test/              session/proxy tests and optional cross-repository browser acceptance
```

The two browser entry points share React while keeping dashboard pages out of checkout code. Only test acceptance loads core fixtures. Production code and ordinary UI checks have no sibling-repository imports.

## Deployment boundary

Use HTTPS for non-loopback origins. Preserve the public Host header when reverse-proxying the UI; `UI_PUBLIC_URL` must match it exactly. Run core on a private listener or authenticated HTTPS endpoint. Incoming browser Origin is checked; responses are non-cacheable and carry a content security policy. Cookies are Secure for HTTPS, HttpOnly and SameSite=Strict.

[Fastify secure-session](https://github.com/fastify/fastify-secure-session) provides encrypted sessions. Sessions expire after eight hours. Rotating the session key or password hash invalidates existing sessions; logout removes the current browser's cookie. There is one operator identity, with no individual-session revocation or multi-user roles. Login is rate limited per connecting IP; behind a reverse proxy that is the proxy IP, so keep it behind your organization's access controls if broader team access is needed.

The proxy has explicit read routes, rejects upstream redirects and forwards only the required authorization header. It does not serve as a general-purpose proxy or expose merchant mutations. Dashboard data is sensitive even though the UI is read-only. Core API credentials are still full merchant credentials on the UI server.

The core must support `GET /v1/invoices` with `status`, exact `externalOrderId`, `limit`, `offset` and `hasMore`. Amounts stay integer strings until display. A paid invoice remains paid after a refund; inspect refunds separately. All payment authority remains in core.

## Validation

```sh
npm run check
npm test
npm run build
```

For browser acceptance, install dependencies in both repositories and build the UI. By default `npm run test:browser` locates core at `../payment-core`; set `PAYMENT_CORE_PATH` for another checkout. It starts a real temporary PostgreSQL instance, core API, UI server and simulated EIP-1193 wallet, then checks checkout and dashboard together. It needs Chrome on Windows, or `npx playwright install chromium` on other systems. This uses no money and never opens a user's wallet. `npm run test:checkout` is an alias for the same acceptance run.

Screenshots are written under ignored `.local/`. See [validation](docs/VALIDATION.md) for recorded results.

## Provenance and release

The checkout was moved from the independently implemented payment-core prototype. At the owner's request, the dashboard and checkout now use the actual Kokoro Pay v2 card, table, button, input and label components, dark charcoal/indigo theme and Geist fonts. The sidebar, header and login layout are adapted from that source for the standalone API and session. Payment behavior remains in the core. See [provenance](docs/PROVENANCE.md) for exact source paths and adaptations.

Released under the [MIT license](LICENSE), with [third-party notices](THIRD_PARTY_NOTICES.md) retained for the shared UI and fonts. GitLab and GitHub CI check types, tests, builds, dependency advisories and committed-history secrets. Browser acceptance checks the exact core commit recorded in `ci/payment-core.ref`; update that pin deliberately when changing API compatibility. CI does not deploy the service. The package remains `private: true` to prevent accidental npm publication. No original trademark assets, subscription catalog, deployment secrets or original Git history are included.
