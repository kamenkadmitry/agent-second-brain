import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ mode = 'login' as 'login' | 'register' }) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin12345');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'register'>(mode);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (view === 'login') await login(email, password);
      else await register(email, password);
      nav('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 p-8">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">
          {view === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Please wait…' : view === 'login' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => setView((v) => (v === 'login' ? 'register' : 'login'))}
          className="w-full text-xs text-slate-400 hover:text-slate-200"
        >
          {view === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
        </button>
        <p className="text-xs text-slate-500">
          Seeded credentials: <code>admin@example.com / admin12345</code>
        </p>
      </form>
    </div>
  );
}
