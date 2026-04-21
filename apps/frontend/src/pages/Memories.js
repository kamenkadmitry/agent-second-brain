import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import clsx from 'clsx';
const TIER_COLOR = {
    Core: 'bg-yellow-500/20 text-yellow-200 border-yellow-600/40',
    Active: 'bg-green-500/15 text-green-200 border-green-600/40',
    Warm: 'bg-sky-500/15 text-sky-200 border-sky-600/40',
    Cold: 'bg-slate-700/30 text-slate-300 border-slate-500/40',
    Archive: 'bg-slate-900 text-slate-500 border-slate-700',
};
export default function Memories() {
    const [memories, setMemories] = useState([]);
    const [err, setErr] = useState(null);
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [tier, setTier] = useState('Active');
    useEffect(() => { refresh(); }, []);
    function refresh() {
        api('/api/memories').then((r) => setMemories(r.memories)).catch((e) => setErr(e.message));
    }
    async function add() {
        if (!content.trim())
            return;
        await api('/api/memories', { method: 'POST', json: { content, summary, tier } });
        setContent('');
        setSummary('');
        refresh();
    }
    async function changeTier(m, t) {
        await api(`/api/memories/${m.id}`, { method: 'PATCH', json: { tier: t, touch: t === 'Core' } });
        refresh();
    }
    async function touch(m) {
        await api(`/api/memories/${m.id}`, { method: 'PATCH', json: { touch: true } });
        refresh();
    }
    async function remove(m) {
        await api(`/api/memories/${m.id}`, { method: 'DELETE' });
        refresh();
    }
    async function triggerDecay() {
        await api('/api/trigger/decay', { method: 'POST' });
        setTimeout(refresh, 1500);
    }
    return (_jsxs("div", { className: "space-y-4 p-8", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Memories" }), _jsx("button", { onClick: triggerDecay, className: "btn-ghost", children: "Trigger decay pass" })] }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsxs("div", { className: "card space-y-2", children: [_jsx("input", { className: "input", placeholder: "Memory content", value: content, onChange: (e) => setContent(e.target.value) }), _jsx("input", { className: "input", placeholder: "Short summary (optional)", value: summary, onChange: (e) => setSummary(e.target.value) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("select", { className: "input w-auto", value: tier, onChange: (e) => setTier(e.target.value), children: ['Core', 'Active', 'Warm', 'Cold', 'Archive'].map((t) => _jsx("option", { children: t }, t)) }), _jsx("button", { onClick: add, className: "btn-primary", children: "Add memory" })] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [memories.map((m) => (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("div", { className: clsx('mb-1 inline-block rounded border px-2 py-0.5 text-xs', TIER_COLOR[m.tier]), children: [m.tier, " \u00B7 ", m.decayScore.toFixed(0)] }), m.summary && _jsx("div", { className: "text-sm font-medium text-slate-100", children: m.summary }), _jsx("div", { className: "mt-1 whitespace-pre-wrap text-sm text-slate-300", children: m.content })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("select", { value: m.tier, onChange: (e) => changeTier(m, e.target.value), className: "input w-28 text-xs", children: ['Core', 'Active', 'Warm', 'Cold', 'Archive'].map((t) => _jsx("option", { children: t }, t)) }), _jsx("button", { onClick: () => touch(m), className: "btn-ghost text-xs", children: "Touch" }), _jsx("button", { onClick: () => remove(m), className: "btn-danger text-xs", children: "Delete" })] })] }), _jsx("div", { className: "mt-2 flex flex-wrap gap-1 text-xs text-slate-500", children: _jsxs("span", { children: ["Last accessed: ", new Date(m.lastAccessed).toLocaleString()] }) })] }, m.id))), memories.length === 0 && _jsx("div", { className: "text-sm text-slate-500", children: "No memories yet." })] })] }));
}
