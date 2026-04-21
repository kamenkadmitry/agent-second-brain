import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import Eisenhower from './pages/Eisenhower';
import Memories from './pages/Memories';
import Entries from './pages/Entries';
import Skills from './pages/Skills';
import Settings from './pages/Settings';
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, { mode: "login" }) }), _jsx(Route, { path: "/register", element: _jsx(Login, { mode: "register" }) }), _jsxs(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "graph", element: _jsx(GraphView, {}) }), _jsx(Route, { path: "eisenhower", element: _jsx(Eisenhower, {}) }), _jsx(Route, { path: "memories", element: _jsx(Memories, {}) }), _jsx(Route, { path: "entries", element: _jsx(Entries, {}) }), _jsx(Route, { path: "skills", element: _jsx(Skills, {}) }), _jsx(Route, { path: "settings", element: _jsx(Settings, {}) })] })] }));
}
