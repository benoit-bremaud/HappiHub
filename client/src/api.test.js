import { apiFetch, setCsrfToken } from './api';
beforeEach(() => { setCsrfToken(null); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });
afterEach(() => { delete global.fetch; delete process.env.REACT_APP_API_URL; });
test('configured URL, cookie credentials and cancellation signal are preserved', () => {
  process.env.REACT_APP_API_URL = 'https://example.test/api/';
  const signal = new AbortController().signal;
  apiFetch('/account', { signal });
  expect(fetch.mock.calls[0][0]).toBe('https://example.test/api/account');
  expect(fetch.mock.calls[0][1]).toMatchObject({ signal, credentials: 'include' });
});
test('writes receive in-memory CSRF without modifying caller options', () => {
  setCsrfToken('synthetic-csrf');
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  apiFetch('/signup', options);
  expect(fetch.mock.calls[0][1].headers.get('X-CSRF-Token')).toBe('synthetic-csrf');
  expect(options.headers['X-CSRF-Token']).toBeUndefined();
});
test('reads omit CSRF and all calls strip legacy bearer credentials', () => {
  setCsrfToken('synthetic-csrf');
  apiFetch('/account', { headers: { Authorization: 'Bearer legacy', 'X-CSRF-Token': 'caller-token' } });
  expect([...fetch.mock.calls[0][1].headers]).toEqual([]);
});
test('failed writes are never automatically replayed', async () => {
  fetch.mockResolvedValue({ ok: false, status: 403 });
  await apiFetch('/signup', { method: 'POST' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
