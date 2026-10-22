import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWriteContract } from 'wagmi';
import { formatUnits, parseAbi } from 'viem';
import QRCode from 'qrcode';
import { usePayment } from './usePayment';
import { useSubmission } from './useSubmission';
import { PaymentDetails } from './PaymentDetails';
import { isUserRejection } from './walletErrors';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import { LockKeyhole, ArrowRight } from 'lucide-react';
const transferAbi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

export function Checkout() {
  const [params] = useState(() => new URLSearchParams(location.hash.slice(1)));
  const invoiceId = params.get('id'); const token = params.get('token');
  const { payment, error } = usePayment(invoiceId, token);
  const [actionError, setActionError] = useState('');
  const submission = useSubmission(invoiceId, token, payment?.route.chainId, payment?.status === 'paid' || payment?.status === 'cancelled');
  const [qr, setQr] = useState(''); const [copyMessage, setCopyMessage] = useState('');
  const [tab, setTab] = useState<'wallet' | 'manual'>('wallet');
  const sending = useRef(false); const [busy, setBusy] = useState(false);
  const { isConnected, address, chainId } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect(); const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: signing } = useWriteContract();
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const clock = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(clock); }, []);
  useEffect(() => {
    if (!payment) return;
    let cancelled = false;
    QRCode.toDataURL(payment.paymentUri, { width: 240, margin: 2 }).then(value => { if (!cancelled) setQr(value); }).catch(() => setActionError('QR unavailable; use the address below.'));
    return () => { cancelled = true; };
  }, [payment?.paymentUri]);
  const attempt = async (action: () => Promise<unknown>) => {
    setActionError('');
    try { await action(); } catch (e) {
      setActionError(isUserRejection(e) ? 'You declined the wallet request. No payment was submitted by this checkout.' : 'The wallet could not complete the request. Check the transaction status in your wallet before retrying.');
    }
  };
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setCopyMessage(`${label} copied`); } catch { setCopyMessage('Select and copy the value manually.'); }
  };
  const expired = payment ? new Date(payment.expiresAt).getTime() <= now : false;
  const canPay = payment?.status === 'pending' && !expired && !error && (!payment.progress || payment.progress.state === 'awaiting_payment');
  const send = () => attempt(async () => {
    if (!payment || !canPay || submission.blocked || sending.current) return;
    sending.current = true; setBusy(true);
    try {
      const selectedChain = payment.route.chainId as 8453 | 84532;
      if (chainId !== selectedChain) await switchChainAsync({ chainId: selectedChain });
      submission.remember('uncertain');
      try {
        const hash = await writeContractAsync({ address: payment.route.token, abi: transferAbi, functionName: 'transfer',
          args: [payment.recipient, BigInt(payment.amountUnits)], chainId: selectedChain });
        submission.remember(hash);
      } catch (e) {
        // Only explicit rejection proves this request was not broadcast. Other errors remain uncertain.
        if (isUserRejection(e)) submission.remember(null);
        throw e;
      }
    } finally { sending.current = false; setBusy(false); }
  });
  return <main className="checkout"><header className="checkout-header"><span className="checkout-mark">P</span><span>Payment checkout</span><span className="secure"><LockKeyhole className="size-3.5"/>Direct to merchant</span></header>
    <Card className="checkout-card"><CardContent className="checkout-content"><div className="eyebrow">PAYMENT REQUEST</div>
      {!payment ? <><h1>Complete your payment</h1><p>{error || 'Loading your payment request…'}</p></> : <>
        <div className="amount">{formatUnits(BigInt(payment.amountUnits), payment.route.decimals)} <span>{payment.route.symbol}</span></div>
        <div className="network">{payment.route.name}{payment.route.testnet && <span className="badge">TEST NETWORK</span>}</div>
        {payment.status === 'paid' ? <div className="success" role="status"><h1>Payment confirmed</h1><p>Your payment record is ready. {payment.voucherEnabled ? 'The merchant can now retrieve your voucher.' : 'Your receipt is available to the merchant.'}</p><p className="muted">Request {payment.id}</p></div> : payment.status === 'cancelled' ? <div className="notice" role="status"><h1>Payment request cancelled</h1><p>Do not send funds. Transfers already sent will be recorded for merchant review.</p></div> : payment.status === 'needs_review' ? <div className="notice" role="status"><h1>Payment needs review</h1><p>A transfer was recorded but could not be matched automatically. Contact the merchant and keep your transaction ID.</p></div> : <>
          <p className="description">Choose how to pay. Both options send USDC directly to the address below.</p>
          {(expired || payment.status === 'expired') && <div className="notice">This request has expired. If you already paid on time, verification will continue. Do not send another payment.</div>}
          {submission.hash && <div className="notice" role="status">{submission.message}{submission.hash !== 'uncertain' && <code>{submission.hash}</code>}</div>}
          {payment.progress?.state === 'confirming' && <div className="notice" role="status">Payment detected—awaiting confirmation. Do not send another payment.</div>}
          {payment.progress?.state === 'verification_delayed' && <div className="notice" role="status">Verification is delayed. A transfer was previously detected; do not pay again.</div>}
          <div className="tabs" role="tablist" aria-label="Payment method"><Button variant="ghost" role="tab" aria-selected={tab === 'wallet'} onClick={() => setTab('wallet')}>Connect wallet</Button><Button variant="ghost" role="tab" aria-selected={tab === 'manual'} onClick={() => setTab('manual')}>Transfer manually</Button></div>
          {tab === 'wallet' ? <div className="wallet" role="tabpanel">
            {isConnected ? <><p className="muted">Connected: {address?.slice(0, 8)}…{address?.slice(-6)}</p><Button className="primary" disabled={!canPay || busy || signing || submission.blocked} onClick={() => void send()}>{busy || signing ? 'Confirm in your wallet…' : submission.blocked ? 'Payment submitted' : submission.retryAllowed ? 'Retry payment' : chainId !== payment.route.chainId ? 'Switch network and pay' : 'Pay with USDC'}</Button><Button variant="ghost" className="text-button" onClick={() => disconnect()}>Disconnect</Button></> : <>
              {connectors.map(connector => <Button variant="outline" className="wallet-choice" key={connector.uid} disabled={!canPay || connecting} onClick={() => void attempt(() => connectAsync({ connector }))}>{connecting ? 'Connecting…' : connector.name}<ArrowRight className="size-4"/></Button>)}
              <p className="muted">Use a compatible browser wallet, such as MetaMask or Phantom. You approve the transfer inside your wallet.</p></>}
          </div> : <div className="manual" role="tabpanel">{qr && <img className="qr" src={qr} alt="USDC payment request QR code"/>}<p className="muted">Scan with a wallet that supports Ethereum payment links, or copy the details below. Select <strong>{payment.route.name}</strong> when withdrawing from an exchange.</p></div>}
          <PaymentDetails payment={payment} copy={copy}/>
          <p className="muted">Send the exact amount on the displayed network. Wallet or exchange fees are separate. Confirmation may take several minutes.</p>
        </>}
      </>}
      {(error || actionError) && payment && <p role="alert" className="error">{actionError || error}</p>}
      <p className="copy-message" aria-live="polite">{copyMessage}</p>
    </CardContent></Card><footer>Your wallet keeps control of your funds.</footer></main>;
}
