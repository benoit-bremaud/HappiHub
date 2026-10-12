let csrfToken = null;
const base = () => (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const setCsrfToken = (token) => { csrfToken = token; };
/** Send cookie credentials and in-memory CSRF only to the configured API. Never replay writes. */
export const apiFetch = (path, options = {}) => {
  const headers = new Headers(options.headers);
  headers.delete('Authorization');
  headers.delete('X-CSRF-Token');
  if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase()) && csrfToken)
    headers.set('X-CSRF-Token', csrfToken);
  return fetch(`${base()}${path}`, { ...options, headers, credentials: 'include' });
};
