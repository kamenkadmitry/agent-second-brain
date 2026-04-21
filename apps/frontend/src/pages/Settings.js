import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
export default function Settings() {
    const [s, setS] = useState(null);
    const [err, setErr] = useState(null);
    const [ok, setOk] = useState(null);
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
            const r = await api('/api/settings');
            setS(r.settings);
            setLlmBaseUrl(r.settings.llmBaseUrl ?? '');
            setLlmModelName(r.settings.llmModelName ?? '');
            setTelegramChatId(r.settings.telegramChatId ?? '');
        }
        catch (e) {
            setErr(e.message);
        }
    }
    async function save() {
        setErr(null);
        setOk(null);
        const payload = {
            llmBaseUrl,
            llmModelName,
        };
        if (llmApiKey)
            payload.llmApiKey = llmApiKey;
        if (telegramToken)
            payload.telegramToken = telegramToken;
        if (telegramChatId)
            payload.telegramChatId = telegramChatId;
        if (deepgramApiKey)
            payload.deepgramApiKey = deepgramApiKey;
        if (todoistApiKey)
            payload.todoistApiKey = todoistApiKey;
        try {
            await api('/api/settings', { method: 'PATCH', json: payload });
            setOk('Saved.');
            setLlmApiKey('');
            setTelegramToken('');
            setDeepgramApiKey('');
            setTodoistApiKey('');
            load();
        }
        catch (e) {
            setErr(e.message);
        }
    }
    return (_jsxs("div", { className: "space-y-4 p-8", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Settings" }), _jsx("p", { className: "text-sm text-slate-400", children: "Secrets are stored hashed in the DB and only masked values are returned." }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), ok && _jsx("div", { className: "rounded border border-green-900 bg-green-950/50 p-2 text-sm text-green-300", children: ok }), _jsxs("section", { className: "card space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "LLM" }), _jsxs(L, { label: "Base URL", children: ["       ", _jsx("input", { className: "input", value: llmBaseUrl, onChange: (e) => setLlmBaseUrl(e.target.value) })] }), _jsxs(L, { label: "Model", children: ["          ", _jsx("input", { className: "input", value: llmModelName, onChange: (e) => setLlmModelName(e.target.value) })] }), _jsx(L, { label: `API key (current: ${s?.llmApiKey ?? 'not set'})`, children: _jsx("input", { className: "input", placeholder: "sk-\u2026", value: llmApiKey, onChange: (e) => setLlmApiKey(e.target.value) }) })] }), _jsxs("section", { className: "card space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Telegram" }), _jsx(L, { label: `Bot token (current: ${s?.telegramToken ?? 'not set'})`, children: _jsx("input", { className: "input", value: telegramToken, onChange: (e) => setTelegramToken(e.target.value) }) }), _jsx(L, { label: "Your Telegram user id (for webhook routing)", children: _jsx("input", { className: "input", value: telegramChatId, onChange: (e) => setTelegramChatId(e.target.value) }) })] }), _jsxs("section", { className: "card space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Integrations" }), _jsx(L, { label: `Deepgram API key (current: ${s?.deepgramApiKey ?? 'not set'})`, children: _jsx("input", { className: "input", value: deepgramApiKey, onChange: (e) => setDeepgramApiKey(e.target.value) }) }), _jsx(L, { label: `Todoist API key (current: ${s?.todoistApiKey ?? 'not set'})`, children: _jsx("input", { className: "input", value: todoistApiKey, onChange: (e) => setTodoistApiKey(e.target.value) }) })] }), _jsx("button", { onClick: save, className: "btn-primary", children: "Save settings" })] }));
}
function L({ label, children }) {
    return (_jsxs("label", { className: "block", children: [_jsx("div", { className: "mb-1 text-xs uppercase tracking-wide text-slate-400", children: label }), children] }));
}
