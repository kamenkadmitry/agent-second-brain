import { prisma } from '../config/prisma.js';

export interface GraphNode {
  id: string;          // `${type}:${entityId}`
  type: string;
  label: string;
  color?: string;
  group?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export async function buildGraphForUser(userId: string): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const [entries, memories, tasks] = await Promise.all([
    prisma.entry.findMany({ where: { userId }, select: { id: true, content: true, type: true, tags: { select: { id: true, name: true, color: true } } } }),
    prisma.memory.findMany({ where: { userId }, select: { id: true, summary: true, content: true, tier: true, tags: { select: { id: true, name: true, color: true } } } }),
    prisma.task.findMany({ where: { userId }, select: { id: true, content: true, status: true, isUrgent: true, isImportant: true, tags: { select: { id: true, name: true, color: true } } } }),
  ]);

  // Tags are globally unique by name in the schema (not user-scoped). Only
  // surface tags that are actually connected to this user's entities so we
  // never leak another user's tag names as orphan nodes.
  const tagMap = new Map<string, { id: string; name: string; color: string | null }>();
  for (const e of entries) for (const t of e.tags) tagMap.set(t.id, t);
  for (const m of memories) for (const t of m.tags) tagMap.set(t.id, t);
  for (const t of tasks) for (const tg of t.tags) tagMap.set(tg.id, tg);
  const tags = [...tagMap.values()];

  // Scope edges to this user's entity IDs (GraphEdge is shared across users,
  // so an unscoped findMany would load every user's edges into memory).
  const userEntityIds = [
    ...entries.map((e) => e.id),
    ...memories.map((m) => m.id),
    ...tasks.map((t) => t.id),
  ];
  const edges = userEntityIds.length === 0
    ? []
    : await prisma.graphEdge.findMany({
        where: {
          OR: [
            { sourceId: { in: userEntityIds } },
            { targetId: { in: userEntityIds } },
          ],
        },
      });

  const nodes: GraphNode[] = [];
  const pushNode = (n: GraphNode) => nodes.push(n);

  for (const e of entries) {
    pushNode({
      id: `Entry:${e.id}`,
      type: 'Entry',
      label: truncate(e.content, 50),
      color: '#38bdf8',
      group: 'Entry',
    });
  }
  for (const m of memories) {
    pushNode({
      id: `Memory:${m.id}`,
      type: 'Memory',
      label: truncate(m.summary ?? m.content, 50),
      color: m.tier === 'Core' ? '#facc15' : m.tier === 'Archive' ? '#64748b' : '#22c55e',
      group: `Memory:${m.tier}`,
    });
  }
  for (const t of tasks) {
    pushNode({
      id: `Task:${t.id}`,
      type: 'Task',
      label: truncate(t.content, 50),
      color: t.isUrgent && t.isImportant ? '#ef4444' : t.isImportant ? '#f97316' : t.isUrgent ? '#eab308' : '#94a3b8',
      group: 'Task',
    });
  }
  for (const tag of tags) {
    pushNode({
      id: `Tag:${tag.id}`,
      type: 'Tag',
      label: `#${tag.name}`,
      color: tag.color ?? '#a855f7',
      group: 'Tag',
    });
  }

  const links: GraphLink[] = [];

  // Explicit edges (from pipeline).
  for (const edge of edges) {
    links.push({
      source: `${edge.sourceType}:${edge.sourceId}`,
      target: `${edge.targetType}:${edge.targetId}`,
      relation: edge.relation,
      weight: edge.weight,
    });
  }

  // Implicit edges from tag relations.
  for (const e of entries) for (const t of e.tags) links.push({ source: `Entry:${e.id}`, target: `Tag:${t.id}`, relation: 'HAS_TAG', weight: 0.5 });
  for (const m of memories) for (const t of m.tags) links.push({ source: `Memory:${m.id}`, target: `Tag:${t.id}`, relation: 'HAS_TAG', weight: 0.5 });
  for (const t of tasks) for (const tg of t.tags) links.push({ source: `Task:${t.id}`, target: `Tag:${tg.id}`, relation: 'HAS_TAG', weight: 0.5 });

  // Only keep links whose endpoints exist in nodes.
  const nodeIds = new Set(nodes.map((n) => n.id));
  const filteredLinks = links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

  return { nodes, links: filteredLinks };
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
