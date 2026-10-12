import { decodeSession } from './session';
/** Request the configured API; omit absent/expired credentials and preserve caller cancellation. */
export const apiFetch = (path, options = {}) => {
  const base = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  delete headers.Authorization;
  if (decodeSession(token)) headers.Authorization = `Bearer ${token}`;
  return fetch(`${base}${path}`, { ...options, headers });
};
