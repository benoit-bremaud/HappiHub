import { act, renderHook, waitFor } from '@testing-library/react';
import { useSend } from './request';

// Each fetch stays pending until the test resolves it, so ordering can be controlled (#368).
let pending;
const reply = (index, body) => act(async () => {
  pending[index].resolve({ ok: true, status: 200, json: async () => body, headers: { get: () => null } });
});
beforeEach(() => {
  pending = [];
  global.fetch = jest.fn((url) => new Promise((resolve) => { pending.push({ url, resolve }); }));
});
afterEach(() => { delete global.fetch; jest.useRealTimers(); });

test('AC1 returns null while loading, then the send() result', async () => {
  const { result } = renderHook(() => useSend('/events'));
  expect(result.current.response).toBeNull();
  await reply(0, { items: [] });
  expect(result.current.response).toMatchObject({ ok: true, status: 200, data: { items: [] } });
});

test('AC2 a null path sends nothing', () => {
  const { result } = renderHook(() => useSend(null));
  expect(result.current.response).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test('AC3 a late response from an earlier path or after unmount is ignored', async () => {
  const { result, rerender, unmount } = renderHook(({ path }) => useSend(path), { initialProps: { path: '/a' } });
  rerender({ path: '/b' });
  expect(result.current.response).toBeNull();
  await reply(0, { from: 'a' });
  expect(result.current.response).toBeNull();
  await reply(1, { from: 'b' });
  expect(result.current.response.data).toEqual({ from: 'b' });
  rerender({ path: '/c' });
  unmount();
  await reply(2, { from: 'c' });
});

test('AC4 retry() resends the same path and shows loading meanwhile', async () => {
  const { result } = renderHook(() => useSend('/events'));
  await reply(0, { n: 1 });
  act(() => result.current.retry());
  expect(result.current.response).toBeNull();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(pending[1].url).toContain('/events');
  await reply(1, { n: 2 });
  expect(result.current.response.data).toEqual({ n: 2 });
});

test('AC5 delay debounces: a change within the delay sends only the last path', async () => {
  jest.useFakeTimers();
  const { rerender } = renderHook(({ path }) => useSend(path, { delay: 250 }), { initialProps: { path: '/q=pa' } });
  act(() => { jest.advanceTimersByTime(100); });
  rerender({ path: '/q=par' });
  act(() => { jest.advanceTimersByTime(249); });
  expect(fetch).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1); });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(pending[0].url).toContain('/q=par');
});
