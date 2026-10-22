import { it, expect } from 'vitest';
import { isUserRejection } from '../checkout/src/walletErrors.js';
it('does not treat RPC rejection or a timeout as wallet user cancellation', () => {
  expect(isUserRejection(new Error('RPC rejected duplicate transaction'))).toBe(false);
  expect(isUserRejection(new Error('timeout'))).toBe(false);
  expect(isUserRejection({ cause: { cause: { code: 4001 } } })).toBe(true);
});
