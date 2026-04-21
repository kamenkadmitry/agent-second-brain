import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
export default function Dashboard() {
    const [entries, setEntries] = useState([]);
    const [memories, setMemories] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [err, setErr] = useState(null);
    useEffect(() => {
        Promise.all([
            api('/api/entries'),
            api('/api/memories'),
            api('/api/tasks'),
        ])
            .then(([e, m, t]) => {
            setEntries(e.entries);
            setMemories(m.memories);
            setTasks(t.tasks);
        })
            .catch((e) => setErr(e.message));
    }, []);
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const coreMem = memories.filter((m) => m.tier === 'Core').length;
    return (_jsxs("div", { className: "space-y-6 p-8", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Dashboard" }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-4", children: [_jsx(Stat, { label: "Entries", value: entries.length, to: "/entries" }), _jsx(Stat, { label: "Memories", value: memories.length, to: "/memories" }), _jsx(Stat, { label: "Core memories", value: coreMem, to: "/memories" }), _jsx(Stat, { label: "Pending tasks", value: pending, to: "/eisenhower" })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { className: "mb-3 text-lg font-semibold", children: "Recent entries" }), _jsxs("ul", { className: "space-y-2", children: [entries.slice(0, 10).map((e) => (_jsxs("li", { className: "flex items-start justify-between gap-3 border-b border-slate-800 pb-2 last:border-b-0 last:pb-0", children: [_jsxs("div", { children: [_jsx("span", { className: "chip mr-2", children: e.type }), _jsx("span", { className: "text-sm text-slate-200", children: e.content.slice(0, 140) }), _jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: e.tags.map((t) => _jsxs("span", { className: "chip", children: ["#", t.name] }, t.id)) })] }), _jsx("time", { className: "shrink-0 text-xs text-slate-500", children: new Date(e.createdAt).toLocaleString() })] }, e.id))), entries.length === 0 && _jsx("li", { className: "text-sm text-slate-500", children: "No entries yet." })] })] })] }));
}
function Stat({ label, value, to }) {
    return (_jsxs(Link, { to: to, className: "card transition hover:border-brand-500", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-slate-400", children: label }), _jsx("div", { className: "mt-2 text-3xl font-semibold", children: value })] }));
}
