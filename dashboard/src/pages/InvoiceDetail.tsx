import { useState } from 'react';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card';
import { useResource } from '../useResource';
import type { Invoice, Receipt, Transfer, Refund, AuditEntry } from '../types';
import { StatusBadge, Loading, Identifier, DataTable, Pagination, date, amount } from '../components';

function ReceiptSummary({ id }: { id: string }) {
  const { data, error } = useResource<Receipt>('/admin-api/invoices/' + id + '/receipt');
  if (!data) return <Loading error={error}/>;
  const voucher = data.voucher;
  return <Card>
    <CardHeader><CardTitle><h2>Receipt & voucher</h2></CardTitle><CardDescription>Finalized payment recorded.</CardDescription></CardHeader>
    <CardContent>{voucher ? <dl className="facts">
      <dt>Voucher ID</dt><dd><Identifier value={voucher.id}/></dd>
      <dt>State</dt><dd><StatusBadge value={voucher.revokedAt ? 'revoked' : voucher.frozenAt ? 'frozen' : voucher.redeemedAt ? 'redeemed' : new Date(voucher.expiresAt) <= new Date() ? 'expired' : 'available'}/></dd>
      <dt>Expires</dt><dd>{date(voucher.expiresAt)}</dd>
    </dl> : <p className="text-sm text-muted-foreground">No voucher was requested.</p>}</CardContent>
  </Card>;
}

function Evidence({ invoice, kind }: { invoice: Invoice; kind: 'transfers' | 'refunds' | 'audit' }) {
  const [offset, setOffset] = useState(0);
  const { data, error } = useResource<{ transfers?: Transfer[]; refunds?: Refund[]; entries?: AuditEntry[] }>(
    '/admin-api/invoices/' + invoice.id + '/' + kind + '?limit=25&offset=' + offset);
  if (!data) return <Loading error={error}/>;
  return <>{kind === 'transfers' ? <DataTable rows={data.transfers ?? []} rowKey={r => r.transaction_hash + ':' + r.log_index} columns={[
    { title: 'Transaction / log', render: r => <><div className="max-w-xs whitespace-normal"><Identifier value={r.transaction_hash}/></div><small>Log {r.log_index} · block {r.block_number}</small></> },
    { title: 'Amount', render: r => amount(r.amount_units, invoice.route.decimals) + ' ' + invoice.route.symbol },
    { title: 'Disposition', render: r => <StatusBadge value={r.disposition}/> },
    { title: 'Review', render: r => r.resolution?.replaceAll('_', ' ') ?? '—' },
    { title: 'Block time', render: r => date(r.block_time) }
  ]}/> : kind === 'refunds' ? <DataTable rows={data.refunds ?? []} rowKey={r => r.id} columns={[
    { title: 'Refund', render: r => <Identifier value={r.id}/> },
    { title: 'Amount', render: r => amount(r.amount_units, invoice.route.decimals) + ' ' + invoice.route.symbol },
    { title: 'State', render: r => <StatusBadge value={r.status}/> },
    { title: 'Recipient', render: r => <Identifier value={r.recipient}/> },
    { title: 'Prepared', render: r => date(r.prepared_at) }
  ]}/> : <DataTable rows={data.entries ?? []} rowKey={r => r.id} columns={[
    { title: 'Action', render: r => r.action }, { title: 'Actor', render: r => r.actor },
    { title: 'Reason', render: r => <span className="whitespace-normal">{r.reason}</span> },
    { title: 'Time', render: r => date(r.created_at) }
  ]}/>}
    <Pagination offset={offset} hasMore={(data.transfers ?? data.refunds ?? data.entries ?? []).length === 25} onChange={setOffset}/>
  </>;
}

export function InvoiceDetail({ id, back }: { id: string; back: () => void }) {
  const { data: invoice, error, refresh } = useResource<Invoice>('/admin-api/invoices/' + id);
  const [kind, setKind] = useState<'transfers' | 'refunds' | 'audit'>('transfers');
  const [version, setVersion] = useState(0);
  return <>
    <Button variant="ghost" onClick={back}><ArrowLeft/>All invoices</Button>
    {!invoice ? <Loading error={error}/> : <>
      <div className="page-header">
        <div className="min-w-0"><h1 className="text-xl font-semibold break-all">{invoice.externalOrderId}</h1><div className="mt-1 text-muted-foreground"><Identifier value={invoice.id}/></div></div>
        <Button variant="outline" onClick={() => { refresh(); setVersion(n => n + 1); }}><RefreshCw/>Refresh</Button>
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><div className="flex items-center justify-between gap-4">
            <CardTitle><h2 className="font-mono text-2xl">{amount(invoice.amountUnits, invoice.route.decimals)} {invoice.route.symbol}</h2></CardTitle>
            <StatusBadge value={invoice.status}/>
          </div></CardHeader>
          <CardContent className="space-y-5">
            <dl className="facts">
              <dt>Network</dt><dd>{invoice.route.name}{invoice.route.testnet ? ' · Test network' : ''}</dd>
              <dt>Receiving address</dt><dd><Identifier value={invoice.recipient}/></dd>
              <dt>Created</dt><dd>{date(invoice.createdAt)}</dd><dt>Expires</dt><dd>{date(invoice.expiresAt)}</dd>
            </dl>
            {invoice.checkoutUrl && <a className="text-link inline-flex items-center gap-2 text-sm" href={invoice.checkoutUrl} target="_blank" rel="noreferrer">Open customer checkout<ExternalLink className="size-3.5"/></a>}
          </CardContent>
        </Card>
        {invoice.status === 'paid' && <ReceiptSummary key={id + ':' + version} id={id}/>}
      </div>
      <Card><CardHeader>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Invoice evidence">
          {(['transfers', 'refunds', 'audit'] as const).map(t => <Button key={t} role="tab" aria-selected={kind === t}
            variant={kind === t ? 'secondary' : 'ghost'} size="sm" onClick={() => setKind(t)}>
            {t === 'audit' ? 'Audit history' : t === 'transfers' ? 'Transfers & reviews' : 'Refunds'}
          </Button>)}
        </div>
      </CardHeader><CardContent role="tabpanel"><Evidence key={id + kind + version} invoice={invoice} kind={kind}/></CardContent></Card>
    </>}
  </>;
}
