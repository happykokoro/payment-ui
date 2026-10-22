export type Status = 'pending' | 'expired' | 'paid' | 'needs_review' | 'cancelled';
export interface Invoice {
  id: string; externalOrderId: string; amountUnits: string; status: Status; recipient: string;
  createdAt: string; expiresAt: string; voucherEnabled: boolean; checkoutUrl?: string | null;
  route: { name: string; symbol: string; decimals: number; testnet: boolean };
}
export interface InvoicePage { invoices: Invoice[]; limit: number; offset: number; hasMore: boolean }
export interface Transfer { transaction_hash: string; log_index: number; amount_units: string; block_number: string; block_time: string; disposition: string; resolution: string | null }
export interface Refund { id: string; status: string; amount_units: string; recipient: string; prepared_at: string; affects_entitlement: boolean }
export interface AuditEntry { id: string; action: string; actor: string; reason: string; created_at: string }
export interface PaymentEvent { id: string; invoice_id: string; event_type: string; attempts: number; created_at: string; next_attempt_at: string; delivered_at: string | null; dead_at: string | null; last_error: string | null }
export interface Receipt { voucher: null | { id: string; expiresAt: string; redeemedAt: string | null; frozenAt: string | null; revokedAt: string | null } }
export interface Health { status: string; alerts: string[]; metrics: { availableAddresses: number; deadEvents: number; oldEvents: number; scanLagBlocks: string }; verification: { lastSuccess: string | null; error: string | null } }
