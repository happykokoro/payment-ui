/** Adapted from Kokoro Pay v2's login page; uses the standalone operator session. */
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { request } from './api';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await request('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }); setPassword(''); onLogin(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed'); }
    finally { setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-background px-4">
    <Card className="w-full max-w-md border-border/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">P</div>
        <CardTitle><h1 className="text-2xl font-semibold">Welcome back</h1></CardTitle>
        <CardDescription>Sign in to your payment dashboard</CardDescription>
      </CardHeader>
      <form onSubmit={e => void submit(e)}>
        <CardContent className="space-y-4 pb-4">
          {error && <p role="alert" className="error">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="password">Dashboard password</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/>
          </div>
        </CardContent>
        <CardFooter><Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin"/>}Sign in</Button></CardFooter>
      </form>
    </Card>
  </main>;
}
