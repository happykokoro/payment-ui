export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/admin-api/')) window.dispatchEvent(new Event('session-expired'));
    throw new Error(result.error?.message ?? 'Request failed. Try again.');
  }
  return result as T;
}
