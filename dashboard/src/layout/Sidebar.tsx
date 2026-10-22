/** Kokoro Pay v2 sidebar, adapted to the standalone routes and operator session. */
import { FileText, Activity, Webhook, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';

export type Page = 'invoices' | 'events' | 'health';
interface Props { page: Page; navigate: (page: Page) => void; logout: () => void; close?: () => void }
const sections = [
  { title: 'Core', items: [{ page: 'invoices' as const, label: 'Invoices', icon: FileText }] },
  { title: 'System', items: [
    { page: 'events' as const, label: 'Webhook deliveries', icon: Webhook },
    { page: 'health' as const, label: 'Service health', icon: Activity }
  ] }
];

export function SidebarContent({ page, navigate, logout, close }: Props) {
  return <>
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">P</div>
      <span className="text-lg font-semibold">Payment UI</span>
      {close && <Button variant="ghost" size="icon" className="ml-auto" aria-label="Close navigation" onClick={close}><X/></Button>}
    </div>
    <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map(section => <div key={section.title} className="space-y-1">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
        {section.items.map(item => {
          const Icon = item.icon;
          return <button key={item.page} aria-current={page === item.page ? 'page' : undefined}
            onClick={() => navigate(item.page)}
            className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
              page === item.page ? 'bg-indigo-600/10 text-indigo-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <Icon className="h-4 w-4 shrink-0"/>{item.label}
          </button>;
        })}
      </div>)}
    </nav>
    <div className="border-t border-border px-3 py-3">
      <div className="flex items-center justify-between px-2">
        <div className="min-w-0"><p className="truncate text-sm font-medium">Merchant</p><p className="text-xs text-muted-foreground">Read-only access</p></div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut/></Button>
      </div>
    </div>
  </>;
}
