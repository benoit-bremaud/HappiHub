import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, setCsrfToken } from './api';
const SessionContext = createContext({ user: null, status: 'loading' });
/** One server-confirmed account state shared by all authenticated controls. */
export const SessionProvider = ({ children }) => {
  const pending = useRef(null);
  const [state, setState] = useState({ user: null, status: 'loading' });
  const acceptSession = useCallback((data) => {
    setCsrfToken(data.csrfToken || null);
    setState({ user: data.user || null, status: data.user ? 'authenticated' : 'anonymous' });
  }, []);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    setCsrfToken(null);
    setState({ user: null, status: 'loading' });
    pending.current = (async () => {
      try {
        const response = await apiFetch('/users/session');
        if (!response.ok) throw new Error('Session unavailable');
        acceptSession(await response.json());
      } catch { setState({ user: null, status: 'unavailable' }); }
      finally { pending.current = null; }
    })();
    return pending.current;
  }, [acceptSession]);
  useEffect(() => { localStorage.removeItem('token'); refresh(); }, [refresh]);
  return <SessionContext.Provider value={{ ...state, acceptSession, refresh }}>{children}</SessionContext.Provider>;
};
export const useSession = () => useContext(SessionContext);
