import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('asb_token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(token));
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        api('/api/auth/me', { token })
            .then((r) => setUser(r.user))
            .catch(() => { setToken(null); localStorage.removeItem('asb_token'); })
            .finally(() => setLoading(false));
    }, [token]);
    const login = useCallback(async (email, password) => {
        const r = await api('/api/auth/login', {
            method: 'POST',
            json: { email, password },
        });
        localStorage.setItem('asb_token', r.token);
        setToken(r.token);
        setUser(r.user);
    }, []);
    const register = useCallback(async (email, password) => {
        const r = await api('/api/auth/register', {
            method: 'POST',
            json: { email, password },
        });
        localStorage.setItem('asb_token', r.token);
        setToken(r.token);
        setUser(r.user);
    }, []);
    const logout = useCallback(() => {
        localStorage.removeItem('asb_token');
        setToken(null);
        setUser(null);
    }, []);
    const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading, login, register, logout]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const v = useContext(AuthContext);
    if (!v)
        throw new Error('useAuth must be used inside AuthProvider');
    return v;
}
