import type { ReactNode } from 'react';
import { formatUnits } from 'viem';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/ui/table';

export function StatusBadge({ value }: { value: string }) {
  return <span className={'status-badge status-' + value}>{value.replaceAll('_', ' ')}</span>;
}
export function DataTable<T>({ rows, columns, rowKey, empty = 'No records found.' }: {
  rows: T[]; columns: { title: string; render: (row: T) => ReactNode }[]; rowKey: (row: T) => string; empty?: string
}) {
  return <Table>
    <TableHeader><TableRow>{columns.map(c => <TableHead key={c.title}>{c.title}</TableHead>)}</TableRow></TableHeader>
    <TableBody>
      {rows.map(row => <TableRow key={rowKey(row)}>{columns.map(c => <TableCell key={c.title}>{c.render(row)}</TableCell>)}</TableRow>)}
      {!rows.length && <TableRow><TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">{empty}</TableCell></TableRow>}
    </TableBody>
  </Table>;
}
export function Pagination({ offset, hasMore, onChange }: { offset: number; hasMore: boolean; onChange: (offset: number) => void }) {
  return <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
    <span className="text-sm text-muted-foreground">Page {offset / 25 + 1}</span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={!offset} onClick={() => onChange(Math.max(0, offset - 25))}><ChevronLeft/>Previous</Button>
      <Button variant="outline" size="sm" disabled={!hasMore || offset >= 100000} onClick={() => onChange(offset + 25)}>Next<ChevronRight/></Button>
    </div>
  </div>;
}
export function Loading({ error }: { error: string }) {
  return error ? <p role="alert" className="error">{error}</p> : <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Loading…</div>;
}
export const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
export const amount = (units: string, decimals = 6) => formatUnits(BigInt(units), decimals);
export function Identifier({ value }: { value: string }) { return <code title={value} className="font-mono text-xs break-all">{value}</code>; }
