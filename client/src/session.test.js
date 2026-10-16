import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SessionProvider, useSession } from './session';
const Consumer = () => { const { account, status, refresh } = useSession(); return <div>{status} {account?.name}<button onClick={refresh}>Refresh</button></div>; };
afterEach(() => { delete global.fetch; localStorage.clear(); });
test('bootstrap restores server-confirmed account and removes only legacy token', async () => {
  localStorage.setItem('token', 'legacy'); localStorage.setItem('preference', 'keep');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ account: { name: 'Owner' }, csrfToken: 'csrf' }) });
  render(<SessionProvider><Consumer /></SessionProvider>);
  expect(await screen.findByText(/authenticated Owner/)).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull(); expect(localStorage.getItem('preference')).toBe('keep');
});
test('outage is unavailable rather than authenticated and explicit retry recovers', async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => ({ account: null, csrfToken: 'csrf' }) });
  render(<SessionProvider><Consumer /></SessionProvider>);
  await screen.findByText(/unavailable/); fireEvent.click(screen.getByText('Refresh'));
  await waitFor(() => expect(screen.getByText(/anonymous/)).toBeInTheDocument());
});

test('StrictMode bootstrap is deduplicated to prevent competing anonymous cookies', async () => {
  const { StrictMode } = require('react');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ account: null, csrfToken: 'csrf' }) });
  render(<StrictMode><SessionProvider><Consumer /></SessionProvider></StrictMode>);
  await screen.findByText(/anonymous/); expect(fetch).toHaveBeenCalledTimes(1);
});
