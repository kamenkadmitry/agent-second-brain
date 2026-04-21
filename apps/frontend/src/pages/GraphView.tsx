import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../api/client';
import type { GraphLink, GraphNode } from '../types';

export default function GraphView() {
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [err, setErr] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    api<{ nodes: GraphNode[]; links: GraphLink[] }>('/api/graph')
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full flex-col p-8">
      <h1 className="mb-2 text-2xl font-bold">Knowledge graph</h1>
      <p className="mb-4 text-sm text-slate-400">Entries, memories, tasks and tags connected by pipeline-generated and tag-based edges.</p>
      {err && <div className="mb-3 rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      <div ref={containerRef} className="card min-h-[480px] flex-1">
        {data.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Graph is empty. Add entries, memories or tasks first.
          </div>
        ) : (
          <ForceGraph2D
            graphData={data}
            width={size.w - 32}
            height={size.h - 32}
            backgroundColor="#020617"
            nodeLabel={(n) => `${(n as GraphNode).type}: ${(n as GraphNode).label}`}
            nodeColor={(n) => (n as GraphNode).color ?? '#6366f1'}
            linkColor={() => '#334155'}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkLabel={(l) => (l as unknown as GraphLink).relation}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node, ctx, scale) => {
              const n = node as GraphNode & { x?: number; y?: number };
              if (scale < 1.5) return;
              const label = n.label;
              ctx.font = `${10 / scale}px sans-serif`;
              ctx.fillStyle = '#e2e8f0';
              ctx.textAlign = 'center';
              ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + 8);
            }}
          />
        )}
      </div>
    </div>
  );
}
