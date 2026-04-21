import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/graph', label: 'Graph' },
  { to: '/eisenhower', label: 'Eisenhower' },
  { to: '/memories', label: 'Memories' },
  { to: '/entries', label: 'Entries' },
  { to: '/skills', label: 'Skills' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100">
      <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-950/80 p-4">
        <h1 className="mb-6 text-lg font-semibold tracking-tight">
          <span className="text-brand-500">Agent</span> Second Brain
        </h1>
        <nav className="space-y-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'block rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-brand-600/20 text-brand-50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <div className="truncate">{user?.email}</div>
          <button onClick={logout} className="btn-ghost mt-2 w-full justify-start text-xs">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
