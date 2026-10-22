/** Kokoro Pay v2's fixed sidebar / 64px header / padded workspace. */
import { useEffect, useRef, type ReactNode } from 'react';
import { Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button';
import { SidebarContent, type Page } from './Sidebar';
const labels: Record<Page, string> = { invoices: 'Invoices', events: 'Webhook deliveries', health: 'Service health' };

export function DashboardLayout({ page, detail, navigate, logout, children }: {
  page: Page; detail: boolean; navigate: (page: Page) => void; logout: () => void; children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  const go = (next: Page) => { close(); navigate(next); };
  useEffect(() => {
    const desktop = matchMedia('(min-width: 768px)');
    const changed = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', changed);
    return () => desktop.removeEventListener('change', changed);
  }, []);
  const props = { page, navigate: go, logout: () => { close(); logout(); } };
  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card md:flex"><SidebarContent {...props}/></aside>
    <dialog ref={dialog} aria-label="Navigation" className="mobile-navigation" onClick={e => { if (e.target === dialog.current) close(); }}>
      <div className="flex h-full flex-col"><SidebarContent {...props} close={close}/></div>
    </dialog>
    <div className="min-w-0 md:ml-64">
      <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => dialog.current?.showModal()}><Menu/></Button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-semibold">{labels[page]}</span>
          {detail && <><ChevronRight className="size-3.5 text-muted-foreground"/><span className="text-muted-foreground">Payment details</span></>}
        </div>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">Merchant dashboard</span>
      </header>
      <main className="min-w-0 space-y-6 p-4 md:p-6">{children}</main>
    </div>
  </div>;
}
