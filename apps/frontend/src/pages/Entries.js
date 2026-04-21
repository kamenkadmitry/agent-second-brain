import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
export default function Entries() {
    const [entries, setEntries] = useState([]);
    const [err, setErr] = useState(null);
    const [content, setContent] = useState('');
    const [type, setType] = useState('text');
    const [tagsInput, setTagsInput] = useState('');
    useEffect(() => { refresh(); }, []);
    function refresh() {
        api('/api/entries').then((r) => setEntries(r.entries)).catch((e) => setErr(e.message));
    }
    async function add() {
        if (!content.trim())
            return;
        const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
        await api('/api/entries', { method: 'POST', json: { content, type, tags } });
        setContent('');
        setTagsInput('');
        refresh();
    }
    async function remove(e) {
        await api(`/api/entries/${e.id}`, { method: 'DELETE' });
        refresh();
    }
    return (_jsxs("div", { className: "space-y-4 p-8", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Entries" }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsxs("div", { className: "card space-y-2", children: [_jsx("textarea", { className: "input h-24", placeholder: "Entry content", value: content, onChange: (e) => setContent(e.target.value) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("select", { className: "input w-auto", value: type, onChange: (e) => setType(e.target.value), children: ['text', 'voice', 'image', 'url', 'forward'].map((t) => _jsx("option", { children: t }, t)) }), _jsx("input", { className: "input", placeholder: "Tags (comma-separated)", value: tagsInput, onChange: (e) => setTagsInput(e.target.value) }), _jsx("button", { onClick: add, className: "btn-primary", children: "Capture" })] })] }), _jsxs("ul", { className: "space-y-2", children: [entries.map((e) => (_jsxs("li", { className: "card flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "chip", children: e.type }), _jsx("time", { className: "text-xs text-slate-500", children: new Date(e.createdAt).toLocaleString() })] }), _jsx("div", { className: "mt-2 whitespace-pre-wrap text-sm text-slate-200", children: e.content }), _jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: e.tags.map((t) => _jsxs("span", { className: "chip", children: ["#", t.name] }, t.id)) })] }), _jsx("button", { onClick: () => remove(e), className: "btn-danger text-sm", children: "Delete" })] }, e.id))), entries.length === 0 && _jsx("li", { className: "text-sm text-slate-500", children: "No entries yet." })] })] }));
}
