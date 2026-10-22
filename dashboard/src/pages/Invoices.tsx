import { useState, type FormEvent } from 'react';
import { FileText, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { useResource } from '../useResource';
import type { InvoicePage } from '../types';
import { DataTable, StatusBadge, Pagination, Loading, date, amount } from '../components';
const filters = [['', 'All'], ['pending', 'Pending'], ['paid', 'Paid'], ['expired', 'Expired'], ['cancelled', 'Cancelled'], ['needs_review', 'Needs review']] as const;

export function Invoices({ open }: { open: (id: string) => void }) {
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const query = new URLSearchParams({ limit: '25', offset: String(offset), ...(status ? { status } : {}), ...(search ? { externalOrderId: search } : {}) });
  const { data, error, refresh } = useResource<InvoicePage>('/admin-api/invoices?' + query);
  const submit = (event: FormEvent) => { event.preventDefault(); setOffset(0); setSearch(order.trim()); };
  return <>
    <div className="page-header">
      <div className="page-title"><FileText/><h1>Invoices</h1></div>
      <Button variant="outline" onClick={refresh}><RefreshCw/>Refresh</Button>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by payment status">
      {filters.map(([value, label]) => <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'}
        aria-pressed={status === value} onClick={() => { setStatus(value); setOffset(0); }}>{label}</Button>)}
    </div>
    <Card>
      <CardHeader><CardTitle>Payment requests</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="min-w-0 flex-1 space-y-2 sm:max-w-sm">
            <Label htmlFor="order-search">External order ID</Label>
            <Input id="order-search" placeholder="Exact order ID" value={order} maxLength={128} onChange={e => setOrder(e.target.value)}/>
          </div>
          <Button variant="outline" type="submit"><Search/>Search</Button>
        </form>
        {data ? <>
          <DataTable rows={data.invoices} rowKey={r => r.id} columns={[
            { title: 'Order', render: r => <button className="text-link font-medium" onClick={() => open(r.id)}>{r.externalOrderId}</button> },
            { title: 'Amount', render: r => <span className="font-mono">{amount(r.amountUnits, r.route.decimals)} {r.route.symbol}</span> },
            { title: 'Status', render: r => <StatusBadge value={r.status}/> },
            { title: 'Network', render: r => <>{r.route.name}{r.route.testnet && <small>Test network</small>}</> },
            { title: 'Created', render: r => <span className="text-muted-foreground">{date(r.createdAt)}</span> }
          ]}/>
          <Pagination offset={offset} hasMore={data.hasMore} onChange={setOffset}/>
        </> : <Loading error={error}/>}
      </CardContent>
    </Card>
  </>;
}
