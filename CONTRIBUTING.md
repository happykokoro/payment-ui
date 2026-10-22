# Contributing

Use Node.js 22.14 or newer. Run `npm ci`, `npm run check`, `npm test` and
`npm run build`. For browser acceptance, install the core's dependencies and
set `PAYMENT_CORE_PATH` to its checkout, then run `npm run test:browser`.
Use Chrome on Windows or `npx playwright install --with-deps chromium` on Linux.
Tests use temporary databases and a simulated wallet; no real funds are needed.

CI tests the published core commit pinned in `ci/payment-core.ref`. Update that
pin only after the corresponding core commit passes its own CI. CI clones core
into `.local/payment-core`; production UI code communicates with core over HTTP.

Keep checkout, dashboard, shared presentation and server authentication/proxy
modules separate. Preserve the Kokoro Pay presentation and upstream notices.
Cover changes to payment behavior, sessions and API boundaries with regression
tests. Discuss new features before expanding the scope. Submit a focused merge
request or pull request with the behavior change and validation.

Never commit `.env`, browser sessions, credentials, screenshots, database files,
build output or dependencies. Contributions use this repository's MIT license.
