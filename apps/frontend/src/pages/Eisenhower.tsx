import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useDroppable, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import { api } from '../api/client';
import type { Task } from '../types';
import clsx from 'clsx';

type Quadrant = 'DO' | 'SCHEDULE' | 'DELEGATE' | 'ELIMINATE';

function quadrantOf(t: Task): Quadrant {
  if (t.isUrgent && t.isImportant) return 'DO';
  if (!t.isUrgent && t.isImportant) return 'SCHEDULE';
  if (t.isUrgent && !t.isImportant) return 'DELEGATE';
  return 'ELIMINATE';
}

const QUADRANTS: { id: Quadrant; title: string; subtitle: string; color: string }[] = [
  { id: 'DO',        title: 'Do',        subtitle: 'Urgent · Important',         color: 'border-red-600/60' },
  { id: 'SCHEDULE',  title: 'Schedule',  subtitle: 'Not urgent · Important',     color: 'border-orange-500/60' },
  { id: 'DELEGATE',  title: 'Delegate',  subtitle: 'Urgent · Not important',     color: 'border-yellow-500/60' },
  { id: 'ELIMINATE', title: 'Eliminate', subtitle: 'Not urgent · Not important', color: 'border-slate-600/60' },
];

export default function Eisenhower() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { refresh(); }, []);
  function refresh() {
    api<{ tasks: Task[] }>('/api/tasks')
      .then((r) => setTasks(r.tasks.filter((t) => t.status !== 'archived')))
      .catch((e) => setErr((e as Error).message));
  }

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const taskId = String(e.active.id);
    const target = e.over.id as Quadrant;
    const isUrgent = target === 'DO' || target === 'DELEGATE';
    const isImportant = target === 'DO' || target === 'SCHEDULE';
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isUrgent, isImportant } : t)));
    try {
      await api(`/api/tasks/${taskId}`, { method: 'PATCH', json: { isUrgent, isImportant } });
    } catch (e) {
      setErr((e as Error).message);
      refresh();
    }
  }

  async function addTask() {
    if (!newContent.trim()) return;
    try {
      await api('/api/tasks', { method: 'POST', json: { content: newContent, isUrgent: false, isImportant: false } });
      setNewContent('');
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function toggleComplete(t: Task) {
    await api(`/api/tasks/${t.id}`, { method: 'PATCH', json: { status: t.status === 'pending' ? 'completed' : 'pending' } });
    refresh();
  }

  async function removeTask(t: Task) {
    await api(`/api/tasks/${t.id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-bold">Eisenhower matrix</h1>
      <p className="text-sm text-slate-400">Drag tasks between quadrants to change urgency / importance.</p>
      {err && <div className="rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300">{err}</div>}
      <div className="flex gap-2">
        <input className="input" placeholder="New task…" value={newContent} onChange={(e) => setNewContent(e.target.value)} />
        <button onClick={addTask} className="btn-primary">Add</button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {QUADRANTS.map((q) => (
            <DropZone key={q.id} quadrant={q}>
              {tasks.filter((t) => quadrantOf(t) === q.id).map((t) => (
                <DraggableCard
                  key={t.id}
                  task={t}
                  onToggle={() => toggleComplete(t)}
                  onDelete={() => removeTask(t)}
                />
              ))}
            </DropZone>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function DropZone({ quadrant, children }: { quadrant: (typeof QUADRANTS)[number]; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: quadrant.id });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'card min-h-[200px] border-l-4 transition',
        quadrant.color,
        isOver && 'ring-2 ring-brand-500',
      )}
    >
      <div className="mb-3">
        <div className="font-semibold">{quadrant.title}</div>
        <div className="text-xs text-slate-400">{quadrant.subtitle}</div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DraggableCard({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'rounded-md border border-slate-700 bg-slate-900 p-3 text-sm shadow',
        isDragging && 'opacity-60',
        task.status === 'completed' && 'line-through opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span {...attributes} {...listeners} className="cursor-grab">{task.content}</span>
        <div className="flex gap-1">
          <button onClick={onToggle} className="btn-ghost text-xs">{task.status === 'pending' ? '✓' : '↺'}</button>
          <button onClick={onDelete} className="btn-danger text-xs">×</button>
        </div>
      </div>
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((t) => <span key={t.id} className="chip">#{t.name}</span>)}
        </div>
      )}
    </div>
  );
}
