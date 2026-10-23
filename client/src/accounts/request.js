import { useEffect, useState } from 'react';
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
