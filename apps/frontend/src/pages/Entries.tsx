import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Entry, EntryType } from '../types';

export default function Entries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [type, setType] = useState<EntryType>('text');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => { refresh(); }, []);
  function refresh() {
    api<{ entries: Entry[] }>('/api/entries').then((r) => setEntries(r.entries)).catch((e) => setErr((e as Error).message));
  }

  async function add() {
    if (!content.trim()) return;
    const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
    await api('/api/entries', { method: 'POST', json: { content, type, tags } });
    setContent(''); setTagsInput('');
    refresh();
  }

  async function remove(e: Entry) {
    await api(`/api/entries/${e.id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-bold">Entries</h1>
      {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      <div className="card space-y-2">
        <textarea className="input h-24" placeholder="Entry content" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="flex gap-2">
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as EntryType)}>
            {(['text','voice','image','url','forward'] as EntryType[]).map((t) => <option key={t}>{t}</option>)}
          </select>
          <input className="input" placeholder="Tags (comma-separated)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          <button onClick={add} className="btn-primary">Capture</button>
        </div>
      </div>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="card flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip">{e.type}</span>
                <time className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</time>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{e.content}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {e.tags.map((t) => <span key={t.id} className="chip">#{t.name}</span>)}
              </div>
            </div>
            <button onClick={() => remove(e)} className="btn-danger text-sm">Delete</button>
          </li>
        ))}
        {entries.length === 0 && <li className="text-sm text-slate-500">No entries yet.</li>}
      </ul>
    </div>
  );
}
