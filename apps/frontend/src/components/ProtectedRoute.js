import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export default function ProtectedRoute({ children }) {
    const { token, loading } = useAuth();
    if (loading)
        return _jsx("div", { className: "flex h-screen items-center justify-center text-slate-400", children: "Loading\u2026" });
    if (!token)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
