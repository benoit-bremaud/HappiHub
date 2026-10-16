import { apiFetch } from '../api';

/** JSON call to the API; never throws for HTTP errors so screens can show the server message. */
export const send = async (path, method = 'GET', body) => {
  try {
    const response = await apiFetch(path, {
      method, ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: 'Network error. Your input has been kept; try again.' } };
  }
};

/** Read a link token from the URL fragment once, then remove it from the address bar (DF3). */
export const takeFragmentToken = () => {
  const token = window.location.hash.slice(1);
  if (token) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return token;
};

export const PASSWORD_HINT = 'Use 15 to 64 characters, for example a sentence of 3 or 4 words.';
