#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -ne 0
unset TEST_DATABASE_URL

# Only test an explicitly pinned, already published core commit.
core_ref="$(tr -d '\r\n' < ci/payment-core.ref)"
[[ "$core_ref" =~ ^[0-9a-f]{40}$ ]]
export PAYMENT_CORE_PATH="$PWD/.local/payment-core"
git clone --no-checkout https://github.com/happykokoro/payment-core.git "$PAYMENT_CORE_PATH"
git -C "$PAYMENT_CORE_PATH" checkout --detach "$core_ref"
test "$(git -C "$PAYMENT_CORE_PATH" rev-parse HEAD)" = "$core_ref"
npm --prefix "$PAYMENT_CORE_PATH" ci --no-fund
npm run build
npm run test:browser
