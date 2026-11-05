import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';

/** JSON call to the API; never throws for HTTP errors so screens can show the server message. */
export const send = async (path, method = 'GET', body) => {
  try {
    const response = await apiFetch(path, {
      method, ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data, retryAfter: Number(response.headers?.get('Retry-After')) || null };
  } catch {
    return { ok: false, status: 0, data: { message: 'Network error. Your input has been kept; try again.' } };
  }
};

/**
 * GET `path` once mounted and whenever it changes (#368). `response` is the send() result of the
 * current path, or null while it loads or while `path` is null (idle); with `keepPrevious` the last
 * loaded response stays until the new one lands. A late response from an earlier run or an
 * unmounted screen is ignored. `delay` debounces the request; `retry()` resends.
 */
const IDLE = { key: null, response: null };
export const useSend = (path, { delay = 0, keepPrevious = false } = {}) => {
  const [loaded, setLoaded] = useState(IDLE);
  const [attempt, setAttempt] = useState(0);
  const key = path === null ? null : `${attempt} ${path}`;
  useEffect(() => {
    if (key === null) return undefined;
    let current = true;
    const run = async () => {
      const response = await send(path);
      if (current) setLoaded({ key, response });
    };
    const timer = delay > 0 ? setTimeout(run, delay) : void run();
    return () => {
      current = false;
      clearTimeout(timer);
      // Forget this run's response so a later return to the same path loads again.
      if (!keepPrevious) setLoaded(IDLE);
    };
  }, [key, path, delay, keepPrevious]);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
    if (key === null) return { response: null, retry };
  return { response: keepPrevious || loaded.key === key ? loaded.response : null, retry };
};

/**
 * Link token from the URL fragment (DF3). The read is pure, so StrictMode's double render gets
 * the same value; the fragment is removed from the address bar after mount.
 */
export const useFragmentToken = () => {
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  return token;
};

export const PASSWORD_HINT = 'Use 15 to 64 characters, for example a sentence of 3 or 4 words.';
