import { useEffect, useState } from 'react';
import { request } from './api';
import { Login } from './Login';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { Events } from './pages/Events';
import { ServiceHealth } from './pages/ServiceHealth';
import { DashboardLayout } from './layout/DashboardLayout';
import type { Page } from './layout/Sidebar';
import { Loading } from './components';

export function App() {
  const [session, setSession] = useState<'loading' | 'signed-in' | 'signed-out'>('loading');
  const [page, setPage] = useState<Page>('invoices');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request('/auth/session').then(() => { if (active) setSession('signed-in'); }).catch(() => { if (active) setSession('signed-out'); });
    const expired = () => { setSession('signed-out'); setInvoice(null); };
    window.addEventListener('session-expired', expired);
    return () => { active = false; window.removeEventListener('session-expired', expired); };
  }, []);
  const logout = async () => {
    try { await request('/auth/logout', { method: 'POST', body: '{}' }); setSession('signed-out'); setInvoice(null); setError(''); }
    catch { setError('Could not sign out. Please retry.'); }
  };
  if (session === 'loading') return <Loading error=""/>;
  if (session === 'signed-out') return <Login onLogin={() => { setSession('signed-in'); setPage('invoices'); setInvoice(null); }}/>;
  return <DashboardLayout page={page} detail={Boolean(invoice)} navigate={next => { setPage(next); setInvoice(null); }} logout={() => void logout()}>
    {error && <p role="alert" className="error">{error}</p>}
    {page === 'invoices' && (invoice ? <InvoiceDetail id={invoice} back={() => setInvoice(null)}/> : <Invoices open={setInvoice}/>)}
    {page === 'events' && <Events open={id => { setInvoice(id); setPage('invoices'); }}/>}
    {page === 'health' && <ServiceHealth/>}
  </DashboardLayout>;
}
