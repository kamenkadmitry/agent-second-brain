import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Entry, Memory, Task } from '../types';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ entries: Entry[] }>('/api/entries'),
      api<{ memories: Memory[] }>('/api/memories'),
      api<{ tasks: Task[] }>('/api/tasks'),
    ])
      .then(([e, m, t]) => {
        setEntries(e.entries); setMemories(m.memories); setTasks(t.tasks);
      })
      .catch((e) => setErr((e as Error).message));
  }, []);

  const pending = tasks.filter((t) => t.status === 'pending').length;
  const coreMem = memories.filter((m) => m.tier === 'Core').length;

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Entries"          value={entries.length} to="/entries" />
        <Stat label="Memories"         value={memories.length} to="/memories" />
        <Stat label="Core memories"    value={coreMem} to="/memories" />
        <Stat label="Pending tasks"    value={pending} to="/eisenhower" />
      </div>
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Recent entries</h2>
        <ul className="space-y-2">
          {entries.slice(0, 10).map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2 last:border-b-0 last:pb-0">
              <div>
                <span className="chip mr-2">{e.type}</span>
                <span className="text-sm text-slate-200">{e.content.slice(0, 140)}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {e.tags.map((t) => <span key={t.id} className="chip">#{t.name}</span>)}
                </div>
              </div>
              <time className="shrink-0 text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</time>
            </li>
          ))}
          {entries.length === 0 && <li className="text-sm text-slate-500">No entries yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="card transition hover:border-brand-500">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Link>
  );
}
