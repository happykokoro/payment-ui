import type { Address } from 'viem';
export type Payment = { id: string; status: 'pending' | 'expired' | 'paid' | 'needs_review' | 'cancelled'; amountUnits: string; recipient: Address;
  expiresAt: string; route: { id: string; name: string; chainId: number; token: Address; decimals: number; symbol: string; testnet: boolean };
  paymentUri: string; voucherEnabled: boolean;
  progress?: { state: 'awaiting_payment' | 'confirming' | 'verification_delayed'; transactionHashes: string[] } };
