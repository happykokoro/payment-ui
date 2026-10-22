import { useEffect, useState } from 'react';
import { request } from './api';
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    request<T>(path, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load data'); });
    return () => controller.abort();
  }, [path, version]);
  return { data, error, refresh: () => setVersion(n => n + 1) };
}
