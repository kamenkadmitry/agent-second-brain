import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Memory, MemoryTier } from '../types';
import clsx from 'clsx';

const TIER_COLOR: Record<MemoryTier, string> = {
  Core:    'bg-yellow-500/20 text-yellow-200 border-yellow-600/40',
  Active:  'bg-green-500/15 text-green-200 border-green-600/40',
  Warm:    'bg-sky-500/15 text-sky-200 border-sky-600/40',
  Cold:    'bg-slate-700/30 text-slate-300 border-slate-500/40',
  Archive: 'bg-slate-900 text-slate-500 border-slate-700',
};

export default function Memories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tier, setTier] = useState<MemoryTier>('Active');

  useEffect(() => { refresh(); }, []);
  function refresh() {
    api<{ memories: Memory[] }>('/api/memories').then((r) => setMemories(r.memories)).catch((e) => setErr((e as Error).message));
  }

  async function add() {
    if (!content.trim()) return;
    await api('/api/memories', { method: 'POST', json: { content, summary, tier } });
    setContent(''); setSummary('');
    refresh();
  }

  async function changeTier(m: Memory, t: MemoryTier) {
    await api(`/api/memories/${m.id}`, { method: 'PATCH', json: { tier: t, touch: t === 'Core' } });
    refresh();
  }

  async function touch(m: Memory) {
    await api(`/api/memories/${m.id}`, { method: 'PATCH', json: { touch: true } });
    refresh();
  }

  async function remove(m: Memory) {
    await api(`/api/memories/${m.id}`, { method: 'DELETE' });
    refresh();
  }

  async function triggerDecay() {
    await api('/api/trigger/decay', { method: 'POST' });
    setTimeout(refresh, 1500);
  }

  return (
    <div className="space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Memories</h1>
        <button onClick={triggerDecay} className="btn-ghost">Trigger decay pass</button>
      </div>
      {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      <div className="card space-y-2">
        <input className="input" placeholder="Memory content" value={content} onChange={(e) => setContent(e.target.value)} />
        <input className="input" placeholder="Short summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={tier} onChange={(e) => setTier(e.target.value as MemoryTier)}>
            {(['Core','Active','Warm','Cold','Archive'] as MemoryTier[]).map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={add} className="btn-primary">Add memory</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {memories.map((m) => (
          <div key={m.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={clsx('mb-1 inline-block rounded border px-2 py-0.5 text-xs', TIER_COLOR[m.tier])}>{m.tier} · {m.decayScore.toFixed(0)}</div>
                {m.summary && <div className="text-sm font-medium text-slate-100">{m.summary}</div>}
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{m.content}</div>
              </div>
              <div className="flex flex-col gap-1">
                <select value={m.tier} onChange={(e) => changeTier(m, e.target.value as MemoryTier)} className="input w-28 text-xs">
                  {(['Core','Active','Warm','Cold','Archive'] as MemoryTier[]).map((t) => <option key={t}>{t}</option>)}
                </select>
                <button onClick={() => touch(m)} className="btn-ghost text-xs">Touch</button>
                <button onClick={() => remove(m)} className="btn-danger text-xs">Delete</button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
              <span>Last accessed: {new Date(m.lastAccessed).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {memories.length === 0 && <div className="text-sm text-slate-500">No memories yet.</div>}
      </div>
    </div>
  );
}
