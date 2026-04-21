import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Settings as SettingsT } from '../types';

export default function Settings() {
  const [s, setS] = useState<SettingsT | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModelName, setLlmModelName] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [deepgramApiKey, setDeepgramApiKey] = useState('');
  const [todoistApiKey, setTodoistApiKey] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const r = await api<{ settings: SettingsT }>('/api/settings');
      setS(r.settings);
      setLlmBaseUrl(r.settings.llmBaseUrl ?? '');
      setLlmModelName(r.settings.llmModelName ?? '');
      setTelegramChatId(r.settings.telegramChatId ?? '');
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function save() {
    setErr(null); setOk(null);
    const payload: Record<string, unknown> = {
      llmBaseUrl,
      llmModelName,
    };
    if (llmApiKey)        payload.llmApiKey = llmApiKey;
    if (telegramToken)    payload.telegramToken = telegramToken;
    if (telegramChatId)   payload.telegramChatId = telegramChatId;
    if (deepgramApiKey)   payload.deepgramApiKey = deepgramApiKey;
    if (todoistApiKey)    payload.todoistApiKey = todoistApiKey;

    try {
      await api('/api/settings', { method: 'PATCH', json: payload });
      setOk('Saved.');
      setLlmApiKey(''); setTelegramToken(''); setDeepgramApiKey(''); setTodoistApiKey('');
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-slate-400">Secrets are stored hashed in the DB and only masked values are returned.</p>
      {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      {ok && <div className="rounded border border-green-900 bg-green-950/50 p-2 text-sm text-green-300">{ok}</div>}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">LLM</h2>
        <L label="Base URL">       <input className="input" value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)} /></L>
        <L label="Model">          <input className="input" value={llmModelName} onChange={(e) => setLlmModelName(e.target.value)} /></L>
        <L label={`API key (current: ${s?.llmApiKey ?? 'not set'})`}>
          <input className="input" placeholder="sk-…" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} />
        </L>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Telegram</h2>
        <L label={`Bot token (current: ${s?.telegramToken ?? 'not set'})`}>
          <input className="input" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} />
        </L>
        <L label="Your Telegram user id (for webhook routing)">
          <input className="input" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
        </L>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <L label={`Deepgram API key (current: ${s?.deepgramApiKey ?? 'not set'})`}>
          <input className="input" value={deepgramApiKey} onChange={(e) => setDeepgramApiKey(e.target.value)} />
        </L>
        <L label={`Todoist API key (current: ${s?.todoistApiKey ?? 'not set'})`}>
          <input className="input" value={todoistApiKey} onChange={(e) => setTodoistApiKey(e.target.value)} />
        </L>
      </section>

      <button onClick={save} className="btn-primary">Save settings</button>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</div>
      {children}
    </label>
  );
}
