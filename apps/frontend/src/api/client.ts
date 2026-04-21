const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface ApiOptions extends RequestInit {
  token?: string | null;
  json?: unknown;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const token = opts.token ?? localStorage.getItem('asb_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });

  let data: unknown = null;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) data = await res.json();
  else data = await res.text();

  if (!res.ok) {
    const err = data as { error?: string; details?: unknown } | string;
    const message = typeof err === 'string' ? err : err.error ?? `HTTP ${res.status}`;
    const e = new Error(message) as Error & { status?: number; details?: unknown };
    e.status = res.status;
    if (typeof err === 'object') e.details = err.details;
    throw e;
  }
  return data as T;
}
