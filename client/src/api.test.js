import { apiFetch } from './api';
const originalUrl = process.env.REACT_APP_API_URL;
beforeEach(() => { localStorage.clear(); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });
afterEach(() => { delete global.fetch; if (originalUrl === undefined) delete process.env.REACT_APP_API_URL; else process.env.REACT_APP_API_URL = originalUrl; });
test('configured URL and cancellation signal are preserved', () => {
  process.env.REACT_APP_API_URL = 'https://example.test/api/';
  const controller = new AbortController();
  apiFetch('/events/public', { signal: controller.signal });
  expect(fetch).toHaveBeenCalledWith('https://example.test/api/events/public', { headers: {}, signal: controller.signal });
});
test('valid session supplies credential without modifying caller options', () => {
  const token = `e30.${btoa(JSON.stringify({ _id: 'user', exp: Math.floor(Date.now()/1000)+60 }))}.signature`;
  localStorage.setItem('token', token);
  const options = { headers: { 'Content-Type': 'application/json' } };
  apiFetch('/events', options);
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${token}`);
  expect(options.headers.Authorization).toBeUndefined();
});
test('malformed credential cannot leak a caller-provided authorization header', () => {
  localStorage.setItem('token', 'invalid');
  apiFetch('/events/public', { headers: { Authorization: 'Bearer null' } });
  expect(fetch.mock.calls[0][1].headers).toEqual({});
});
