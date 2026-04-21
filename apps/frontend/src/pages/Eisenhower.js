import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useDroppable, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import { api } from '../api/client';
import clsx from 'clsx';
function quadrantOf(t) {
    if (t.isUrgent && t.isImportant)
        return 'DO';
    if (!t.isUrgent && t.isImportant)
        return 'SCHEDULE';
    if (t.isUrgent && !t.isImportant)
        return 'DELEGATE';
    return 'ELIMINATE';
}
const QUADRANTS = [
    { id: 'DO', title: 'Do', subtitle: 'Urgent · Important', color: 'border-red-600/60' },
    { id: 'SCHEDULE', title: 'Schedule', subtitle: 'Not urgent · Important', color: 'border-orange-500/60' },
    { id: 'DELEGATE', title: 'Delegate', subtitle: 'Urgent · Not important', color: 'border-yellow-500/60' },
    { id: 'ELIMINATE', title: 'Eliminate', subtitle: 'Not urgent · Not important', color: 'border-slate-600/60' },
];
export default function Eisenhower() {
    const [tasks, setTasks] = useState([]);
    const [err, setErr] = useState(null);
    const [newContent, setNewContent] = useState('');
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    useEffect(() => { refresh(); }, []);
    function refresh() {
        api('/api/tasks')
            .then((r) => setTasks(r.tasks.filter((t) => t.status !== 'archived')))
            .catch((e) => setErr(e.message));
    }
    async function onDragEnd(e) {
        if (!e.over)
            return;
        const taskId = String(e.active.id);
        const target = e.over.id;
        const isUrgent = target === 'DO' || target === 'DELEGATE';
        const isImportant = target === 'DO' || target === 'SCHEDULE';
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isUrgent, isImportant } : t)));
        try {
            await api(`/api/tasks/${taskId}`, { method: 'PATCH', json: { isUrgent, isImportant } });
        }
        catch (e) {
            setErr(e.message);
            refresh();
        }
    }
    async function addTask() {
        if (!newContent.trim())
            return;
        try {
            await api('/api/tasks', { method: 'POST', json: { content: newContent, isUrgent: false, isImportant: false } });
            setNewContent('');
            refresh();
        }
        catch (e) {
            setErr(e.message);
        }
    }
    async function toggleComplete(t) {
        await api(`/api/tasks/${t.id}`, { method: 'PATCH', json: { status: t.status === 'pending' ? 'completed' : 'pending' } });
        refresh();
    }
    async function removeTask(t) {
        await api(`/api/tasks/${t.id}`, { method: 'DELETE' });
        refresh();
    }
    return (_jsxs("div", { className: "space-y-4 p-8", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Eisenhower matrix" }), _jsx("p", { className: "text-sm text-slate-400", children: "Drag tasks between quadrants to change urgency / importance." }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "input", placeholder: "New task\u2026", value: newContent, onChange: (e) => setNewContent(e.target.value) }), _jsx("button", { onClick: addTask, className: "btn-primary", children: "Add" })] }), _jsx(DndContext, { sensors: sensors, onDragEnd: onDragEnd, children: _jsx("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: QUADRANTS.map((q) => (_jsx(DropZone, { quadrant: q, children: tasks.filter((t) => quadrantOf(t) === q.id).map((t) => (_jsx(DraggableCard, { task: t, onToggle: () => toggleComplete(t), onDelete: () => removeTask(t) }, t.id))) }, q.id))) }) })] }));
}
function DropZone({ quadrant, children }) {
    const { isOver, setNodeRef } = useDroppable({ id: quadrant.id });
    return (_jsxs("div", { ref: setNodeRef, className: clsx('card min-h-[200px] border-l-4 transition', quadrant.color, isOver && 'ring-2 ring-brand-500'), children: [_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "font-semibold", children: quadrant.title }), _jsx("div", { className: "text-xs text-slate-400", children: quadrant.subtitle })] }), _jsx("div", { className: "space-y-2", children: children })] }));
}
function DraggableCard({ task, onToggle, onDelete, }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    return (_jsxs("div", { ref: setNodeRef, style: style, className: clsx('rounded-md border border-slate-700 bg-slate-900 p-3 text-sm shadow', isDragging && 'opacity-60', task.status === 'completed' && 'line-through opacity-60'), children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("span", { ...attributes, ...listeners, className: "cursor-grab", children: task.content }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: onToggle, className: "btn-ghost text-xs", children: task.status === 'pending' ? '✓' : '↺' }), _jsx("button", { onClick: onDelete, className: "btn-danger text-xs", children: "\u00D7" })] })] }), task.tags.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: task.tags.map((t) => _jsxs("span", { className: "chip", children: ["#", t.name] }, t.id)) }))] }));
}
