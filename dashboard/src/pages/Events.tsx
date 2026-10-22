import { useState } from 'react';
import { Webhook, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card';
import { useResource } from '../useResource';
import type { PaymentEvent } from '../types';
import { DataTable, StatusBadge, Loading, Pagination, Identifier, date } from '../components';

export function Events({ open }: { open: (id: string) => void }) {
  const [offset, setOffset] = useState(0);
  const { data, error, refresh } = useResource<{ events: PaymentEvent[] }>('/admin-api/events?limit=25&offset=' + offset);
  return <>
    <div className="page-header"><div className="page-title"><Webhook/><h1>Webhook deliveries</h1></div><Button variant="outline" onClick={refresh}><RefreshCw/>Refresh</Button></div>
    <Card><CardHeader><CardTitle>Delivery history</CardTitle><CardDescription>Delivery attempts and failures. Manage retries through the core API.</CardDescription></CardHeader>
      <CardContent>{data ? <>
        <DataTable rows={data.events} rowKey={r => r.id} columns={[
          { title: 'Event', render: r => <>{r.event_type}<small><Identifier value={r.id}/></small></> },
          { title: 'Invoice', render: r => <button className="text-link" onClick={() => open(r.invoice_id)}><Identifier value={r.invoice_id}/></button> },
          { title: 'Delivery', render: r => <StatusBadge value={r.delivered_at ? 'delivered' : r.dead_at ? 'failed' : 'queued'}/> },
          { title: 'Attempts', render: r => r.attempts }, { title: 'Created', render: r => date(r.created_at) },
          { title: 'Last error', render: r => <span className="whitespace-normal">{r.last_error ?? '—'}</span> }
        ]}/>
        <Pagination offset={offset} hasMore={data.events.length === 25} onChange={setOffset}/>
      </> : <Loading error={error}/>}</CardContent>
    </Card>
  </>;
}
