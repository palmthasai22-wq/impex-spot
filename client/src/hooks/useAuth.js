import { useState, useEffect, useMemo } from 'react';

export default function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('impex_admin_token'));
  
  useEffect(() => {
    if (token) localStorage.setItem('impex_admin_token', token);
    else localStorage.removeItem('impex_admin_token');
  }, [token]);

  const login = (newToken) => setToken(newToken);
  const logout = () => setToken(null);

  const authData = useMemo(() => {
    if (!token) return { userRole: null, userName: null, isSuperAdmin: false, isAdmin: false };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userRole = payload.role || 'moderator';
      return {
        userRole,
        userName: payload.username || 'Admin',
        isSuperAdmin: userRole === 'admin',
        isAdmin: true // Both admin and moderator have access
      };
    } catch (err) {
      return { userRole: null, userName: null, isSuperAdmin: false, isAdmin: false };
    }
  }, [token]);

  return { ...authData, token, login, logout };
}
