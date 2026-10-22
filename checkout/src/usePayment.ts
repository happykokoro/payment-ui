import { useEffect, useState } from 'react';
import type { Payment } from './types';
export function usePayment(invoiceId: string | null, token: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!invoiceId || !token) { setError('Open the checkout link supplied with your payment request.'); return; }
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/v1/checkout/${encodeURIComponent(invoiceId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? 'This checkout link is invalid.' : 'Payment status is temporarily unavailable. Retrying…');
        const data = await response.json() as Payment;
        if (!controller.signal.aborted) { setPayment(data); setError(''); }
        if (data.status === 'paid' || data.status === 'cancelled') return;
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load payment status.'); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [invoiceId, token]);
  return { payment, error };
}
