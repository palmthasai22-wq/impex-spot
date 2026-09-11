import { useState, useEffect } from 'react';

export default function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('impex_admin_token'));
  
  useEffect(() => {
    if (token) localStorage.setItem('impex_admin_token', token);
    else localStorage.removeItem('impex_admin_token');
  }, [token]);

  const login = (newToken) => setToken(newToken);
  const logout = () => setToken(null);

  return { isAdmin: !!token, token, login, logout };
}
