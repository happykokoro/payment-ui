/** A submitted hash is a progress hint. Only the server can settle or permit a safe retry. */
import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import type { Hash } from 'viem';
type State = 'pending' | 'unknown' | 'confirming' | 'review' | 'failed' | 'not_payment';
export function useSubmission(invoiceId: string | null, token: string | null, chainId?: number, settled = false) {
  const storageKey = `payment-submitted:${invoiceId}`;
  const [hash, setHash] = useState<string | null>(() => { try { return sessionStorage.getItem(storageKey); } catch { return null; } });
  const [state, setState] = useState<State>('pending');
  const publicClient = usePublicClient({ chainId: chainId as 8453 | 84532 | undefined });
  const remember = (value: string | null) => {
    setHash(value); setState('pending');
    try { if (value) sessionStorage.setItem(storageKey, value); else sessionStorage.removeItem(storageKey); } catch { /* Optional local duplicate guard. */ }
  };
  useEffect(() => {
    if (!hash || hash === 'uncertain' || !invoiceId || !token || settled) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/v1/checkout/${encodeURIComponent(invoiceId)}/transactions/${hash}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok) throw new Error('Status unavailable');
        const result = await response.json() as { state: State };
        if (!controller.signal.aborted) setState(result.state);
        if (result.state === 'failed' || result.state === 'not_payment') return;
      } catch { if (!controller.signal.aborted) setState('unknown'); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [hash, invoiceId, token, settled]);
  useEffect(() => {
    if (!publicClient || !hash || hash === 'uncertain' || settled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    // viem detects speedups/cancellations through sender+nonce replacement; server rechecks the resulting hash.
    const watch = async () => {
      try { await publicClient.waitForTransactionReceipt({ hash: hash as Hash, timeout: 60000, onReplaced: replacement => {
        if (!disposed) remember(replacement.transactionReceipt.transactionHash);
      } }); }
      catch { if (!disposed) timer = setTimeout(watch, 5000); } // A timeout never unlocks another payment.
    };
    void watch();
    return () => { disposed = true; clearTimeout(timer); };
  }, [hash, publicClient, settled]);
  const retryAllowed = state === 'failed' || state === 'not_payment';
  const message = hash === 'uncertain' ? 'The wallet response was interrupted. Check your wallet and contact the merchant before sending again.'
    : retryAllowed ? 'The previous transaction is finalized and did not pay this request. You may retry.'
    : state === 'unknown' ? 'Transaction status is uncertain. Do not pay again; check your wallet or contact the merchant.'
    : state === 'review' ? 'A transfer needs merchant review. Keep the transaction ID and do not pay again.'
    : 'Transfer submitted. Waiting for finalized confirmation. You can close this page; verification continues.';
  return { hash, remember, retryAllowed, blocked: Boolean(hash) && !retryAllowed, message };
}
