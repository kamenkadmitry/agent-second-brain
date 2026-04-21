import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export default function Login({ mode = 'login' }) {
    const { login, register } = useAuth();
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('admin12345');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [view, setView] = useState(mode);
    const nav = useNavigate();
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            if (view === 'login')
                await login(email, password);
            else
                await register(email, password);
            nav('/');
        }
        catch (e) {
            setErr(e.message);
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx("div", { className: "flex h-screen items-center justify-center bg-slate-950 p-8", children: _jsxs("form", { onSubmit: submit, className: "card w-full max-w-sm space-y-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: view === 'login' ? 'Sign in' : 'Create account' }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs uppercase tracking-wide text-slate-400", children: "Email" }), _jsx("input", { className: "input", type: "email", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs uppercase tracking-wide text-slate-400", children: "Password" }), _jsx("input", { className: "input", type: "password", value: password, onChange: (e) => setPassword(e.target.value) })] }), err && _jsx("div", { className: "rounded border border-red-900 bg-red-950/50 p-2 text-sm text-red-300", children: err }), _jsx("button", { disabled: busy, className: "btn-primary w-full", children: busy ? 'Please wait…' : view === 'login' ? 'Sign in' : 'Sign up' }), _jsx("button", { type: "button", onClick: () => setView((v) => (v === 'login' ? 'register' : 'login')), className: "w-full text-xs text-slate-400 hover:text-slate-200", children: view === 'login' ? 'No account? Register' : 'Have an account? Sign in' }), _jsxs("p", { className: "text-xs text-slate-500", children: ["Seeded credentials: ", _jsx("code", { children: "admin@example.com / admin12345" })] })] }) }));
}
