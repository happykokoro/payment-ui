import { formatUnits } from 'viem';
import type { Payment } from './types';
import { Button } from '@/ui/button';
export function PaymentDetails({ payment, copy }: { payment: Payment; copy: (value: string, label: string) => Promise<void> }) {
  return <div className="details"><div className="label">RECEIVING ADDRESS</div><div className="copy-row"><code>{payment.recipient}</code><Button variant="ghost" size="sm" aria-label="Copy receiving address" onClick={() => void copy(payment.recipient, 'Address')}>Copy</Button></div>
    <div className="detail-row"><span>Amount to arrive</span><Button variant="ghost" size="sm" onClick={() => void copy(formatUnits(BigInt(payment.amountUnits), payment.route.decimals), 'Amount')}>{formatUnits(BigInt(payment.amountUnits), payment.route.decimals)} USDC · Copy</Button></div>
    <div className="detail-row"><span>Expires</span><span>{new Date(payment.expiresAt).toLocaleString()}</span></div></div>;
}
