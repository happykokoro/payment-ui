# Validation record

Repository split verified locally on 2026-10-22.

## Kokoro Pay UI port — 2026-10-23

Replaced the initial green presentation with Kokoro Pay v2's actual shared components, dark color tokens, indigo navigation, Geist fonts, sidebar/header geometry and login card. The source mapping is recorded in [provenance](PROVENANCE.md). Checkout uses the same theme and ported components; wallet/submission behavior is preserved.

- TypeScript checks, production build and all eight UI tests passed with the added presentation dependencies. npm reported zero vulnerabilities during installation.
- The complete browser acceptance run passed against the newly built assets: checkout/wallet recovery, status-button filtering, exact-order search, invoice evidence, webhook and health pages, session handling, and mobile navigation including Escape dismissal. No page errors were recorded.
- Inspected the new desktop invoice list, mobile invoice details, login and checkout screenshots. The tested 390px layouts have no document overflow; wide evidence tables scroll inside their card.
- Original card/table/button/input/label source is retained in `shared/ui/`; the original light/dark color values are retained in `shared/theme.css`. The core repository and payment state machines were not modified for this presentation change.

Latest screenshots are under ignored `.local/`: `dashboard-list-desktop.png`, `dashboard-list-mobile.png`, `dashboard-desktop.png`, `dashboard-mobile.png`, `dashboard-login.png`, `checkout-desktop.png` and `checkout-mobile.png`. Test services shut down at the end of the successful run.

## Earlier repository split

| Check | Result |
| --- | --- |
| UI TypeScript | Server and both frontend entry points passed |
| UI unit/integration tests | 8 passed across 2 suites |
| Production build | Server, checkout and dashboard passed |
| Cross-repository browser acceptance | Passed against separate UI/core HTTP servers and a real temporary PostgreSQL cluster |
| Desktop/mobile visual review | Dashboard screenshots inspected at 1280px and 390px; no document overflow |
| Dependency audit during install | npm reported zero vulnerabilities for both repositories |

Browser acceptance checks manual QR, injected-wallet discovery, network switching, rejected and interrupted wallet requests, exact transfer encoding, retry only after verified failure, reload duplicate protection, provisional versus final settlement, cancellation and voucher privacy. Dashboard checks include sign-in/out, session persistence across reload, status and exact-order filters, payment evidence, refund/audit tabs, webhook deliveries, health, and denial of merchant reads after logout. No page errors were recorded.

Server tests exercise unauthenticated access denial, cookie attributes, password guessing limits, origin/host rejection, password rotation, tampered cookies, a read-only proxy allowlist, checkout-token forwarding, server-key injection, rejected upstream redirects and configuration validation.

The first browser runs exposed two test selectors that matched nested label/cell text too strictly. They were corrected to select the dropdown by role and the event table cell by its content; the complete subsequent run passed.

The companion core passed 47 tests across six suites, its type checks and API-only build. Migration coverage includes the new invoice-list indexes and preservation of existing credentials. Browser acceptance loads core fixtures only in test code; ordinary UI build/tests are independent.

A pre-existing upstream `ox` notice externalizes unused Tempo `node:worker_threads` code in the browser build. Exercised wallet and dashboard paths reported no browser errors. Browser tests use a simulated EIP-1193 wallet and fixture chain evidence, not a wallet extension or a live payment. No new testnet transfer was needed for this repository/UI change. Earlier live Base Sepolia payment evidence remains in the core validation record.

At the time of this local validation both repositories were on `main` without remotes. Publication and CI are tracked separately in their hosting platforms. UI remains read-only and single-operator; these tests are not a production security audit.
