import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import clsx from 'clsx';
export default function Skills() {
    const [skills, setSkills] = useState([]);
    const [err, setErr] = useState(null);
    useEffect(() => { refresh(); }, []);
    function refresh() {
        api('/api/skills').then((r) => setSkills(r.skills)).catch((e) => setErr(e.message));
    }
    async function toggle(s) {
        await api(`/api/skills/${s.id}`, { method: 'PATCH', json: { enabled: !s.enabled } });
        refresh();
    }
    async function editConfig(s) {
        const raw = prompt(`Config JSON for skill "${s.name}"`, JSON.stringify(s.config, null, 2));
        if (raw === null)
            return;
        try {
            const parsed = JSON.parse(raw);
            await api(`/api/skills/${s.id}`, { method: 'PATCH', json: { config: parsed } });
            refresh();
        }
        catch (e) {
            alert(`Invalid JSON: ${e.message}`);
        }
    }
    return (_jsxs("div", { className: "space-y-4 p-8", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Skills" }), _jsx("p", { className: "text-sm text-slate-400", children: "Toggle predefined system skills. No arbitrary code injection from the UI." }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [skills.map((s) => (_jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: s.name }), _jsx("div", { className: clsx('mt-1 inline-block rounded border px-2 py-0.5 text-xs', s.enabled ? 'border-green-600/40 text-green-300' : 'border-slate-600 text-slate-400'), children: s.enabled ? 'enabled' : 'disabled' }), _jsx("pre", { className: "mt-2 rounded bg-slate-950 p-2 text-xs text-slate-400", children: JSON.stringify(s.config, null, 2) })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("button", { onClick: () => toggle(s), className: "btn-ghost text-xs", children: "Toggle" }), _jsx("button", { onClick: () => editConfig(s), className: "btn-ghost text-xs", children: "Edit config" })] })] }) }, s.id))), skills.length === 0 && _jsx("div", { className: "text-sm text-slate-500", children: "No skills registered." })] })] }));
}
