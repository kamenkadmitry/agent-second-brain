import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Skill } from '../types';
import clsx from 'clsx';

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);
  function refresh() {
    api<{ skills: Skill[] }>('/api/skills').then((r) => setSkills(r.skills)).catch((e) => setErr((e as Error).message));
  }

  async function toggle(s: Skill) {
    await api(`/api/skills/${s.id}`, { method: 'PATCH', json: { enabled: !s.enabled } });
    refresh();
  }

  async function editConfig(s: Skill) {
    const raw = prompt(`Config JSON for skill "${s.name}"`, JSON.stringify(s.config, null, 2));
    if (raw === null) return;
    try {
      const parsed = JSON.parse(raw);
      await api(`/api/skills/${s.id}`, { method: 'PATCH', json: { config: parsed } });
      refresh();
    } catch (e) {
      alert(`Invalid JSON: ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-bold">Skills</h1>
      <p className="text-sm text-slate-400">Toggle predefined system skills. No arbitrary code injection from the UI.</p>
      {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {skills.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className={clsx('mt-1 inline-block rounded border px-2 py-0.5 text-xs', s.enabled ? 'border-green-600/40 text-green-300' : 'border-slate-600 text-slate-400')}>
                  {s.enabled ? 'enabled' : 'disabled'}
                </div>
                <pre className="mt-2 rounded bg-slate-950 p-2 text-xs text-slate-400">{JSON.stringify(s.config, null, 2)}</pre>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => toggle(s)} className="btn-ghost text-xs">Toggle</button>
                <button onClick={() => editConfig(s)} className="btn-ghost text-xs">Edit config</button>
              </div>
            </div>
          </div>
        ))}
        {skills.length === 0 && <div className="text-sm text-slate-500">No skills registered.</div>}
      </div>
    </div>
  );
}
