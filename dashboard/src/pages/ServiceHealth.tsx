import { Activity, RefreshCw, Wallet, AlertCircle, Clock, Blocks } from 'lucide-react';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { useResource } from '../useResource';
import type { Health } from '../types';
import { Loading, StatusBadge, date } from '../components';

export function ServiceHealth() {
  const { data, error, refresh } = useResource<Health>('/admin-api/operations/health');
  return <>
    <div className="page-header"><div className="page-title"><Activity/><h1>Service health</h1></div><Button variant="outline" onClick={refresh}><RefreshCw/>Refresh</Button></div>
    {data ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Available addresses', value: data.metrics.availableAddresses, icon: Wallet },
          { label: 'Failed deliveries', value: data.metrics.deadEvents, icon: AlertCircle },
          { label: 'Delayed deliveries', value: data.metrics.oldEvents, icon: Clock },
          { label: 'Scan lag · blocks', value: data.metrics.scanLagBlocks, icon: Blocks }
        ].map(({ label, value, icon: Icon }) => <Card key={label}>
          <CardHeader><div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-sm">{label}</span><Icon className="size-4"/></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
        </Card>)}
      </div>
      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Verification</CardTitle><StatusBadge value={data.status}/></div></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">Last successful scan: {date(data.verification.lastSuccess)}</p>
          {data.verification.error && <p className="error">{data.verification.error}</p>}
          {data.alerts.length ? <ul className="space-y-2">{data.alerts.map(alert => <li className="flex items-center gap-2 text-amber-400" key={alert}><AlertCircle className="size-4"/>{alert.replaceAll('_', ' ')}</li>)}</ul> : <p>No active alerts.</p>}
        </CardContent>
      </Card>
    </> : <Loading error={error}/>}
  </>;
}
