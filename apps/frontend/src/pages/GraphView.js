import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../api/client';
export default function GraphView() {
    const [data, setData] = useState({ nodes: [], links: [] });
    const [err, setErr] = useState(null);
    const containerRef = useRef(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    useEffect(() => {
        api('/api/graph')
            .then(setData)
            .catch((e) => setErr(e.message));
    }, []);
    useEffect(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
        ro.observe(el);
        setSize({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);
    return (_jsxs("div", { className: "flex h-full flex-col p-8", children: [_jsx("h1", { className: "mb-2 text-2xl font-bold", children: "Knowledge graph" }), _jsx("p", { className: "mb-4 text-sm text-slate-400", children: "Entries, memories, tasks and tags connected by pipeline-generated and tag-based edges." }), err && _jsx("div", { className: "mb-3 rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsx("div", { ref: containerRef, className: "card min-h-[480px] flex-1", children: data.nodes.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-slate-500", children: "Graph is empty. Add entries, memories or tasks first." })) : (_jsx(ForceGraph2D, { graphData: data, width: size.w - 32, height: size.h - 32, backgroundColor: "#020617", nodeLabel: (n) => `${n.type}: ${n.label}`, nodeColor: (n) => n.color ?? '#6366f1', linkColor: () => '#334155', linkDirectionalArrowLength: 3, linkDirectionalArrowRelPos: 1, linkLabel: (l) => l.relation, nodeCanvasObjectMode: () => 'after', nodeCanvasObject: (node, ctx, scale) => {
                        const n = node;
                        if (scale < 1.5)
                            return;
                        const label = n.label;
                        ctx.font = `${10 / scale}px sans-serif`;
                        ctx.fillStyle = '#e2e8f0';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + 8);
                    } })) })] }));
}
