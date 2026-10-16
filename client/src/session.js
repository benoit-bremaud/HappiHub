import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, setCsrfToken } from './api';
const SessionContext = createContext({ account: null, status: 'loading' });
/** One server-confirmed account state shared by all authenticated controls. */
export const SessionProvider = ({ children }) => {
  const pending = useRef(null);
  const [state, setState] = useState({ account: null, status: 'loading' });
  const acceptSession = useCallback((data) => {
    setCsrfToken(data.csrfToken || null);
    setState({ account: data.account || null, status: data.account ? 'authenticated' : 'anonymous' });
  }, []);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    setCsrfToken(null);
    setState({ account: null, status: 'loading' });
    pending.current = (async () => {
      try {
        const response = await apiFetch('/session');
        if (!response.ok) throw new Error('Session unavailable');
        acceptSession(await response.json());
      } catch { setState({ account: null, status: 'unavailable' }); }
      finally { pending.current = null; }
    })();
    return pending.current;
  }, [acceptSession]);
  useEffect(() => { localStorage.removeItem('token'); refresh(); }, [refresh]);
  return <SessionContext.Provider value={{ ...state, acceptSession, refresh }}>{children}</SessionContext.Provider>;
};
export const useSession = () => useContext(SessionContext);
