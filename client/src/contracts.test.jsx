import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Comment } from './components/Comment/Comment';
import { Event } from './components/Event/Event';
import { EventInfo } from './components/Event/EventInfo';
import { EventCreate } from './components/Event/EventCreate';
import { Profil } from './components/Profil/Profil';
const account = '000000000000000000000001';
const signIn = () => localStorage.setItem('token', `e30.${btoa(JSON.stringify({ _id: account, exp: Math.floor(Date.now()/1000)+3600 }))}.signature`);
const reply = (body, ok = true) => Promise.resolve({ ok, json: async () => body });
const mount = (element) => render(<MemoryRouter initialEntries={['/events/abc']}><Routes><Route path="/events/:id" element={element} /><Route path="/login" element={<p>Login screen</p>} /></Routes></MemoryRouter>);
beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });
afterEach(() => { jest.restoreAllMocks(); delete global.fetch; });
test('anonymous comments render without private author objects', async () => {
  fetch.mockImplementation(() => reply([{ _id: 'c1', content: 'Public comment' }])); mount(<Comment />);
  expect(await screen.findByText('Public comment')).toBeInTheDocument();
  expect(fetch.mock.calls[0][1].headers).toEqual({});
  expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
});
test('posting appends secured response without author identity', async () => {
  signIn(); fetch.mockImplementationOnce(() => reply([{ _id: 'c1', content: 'Existing' }])).mockImplementationOnce(() => reply({ _id: 'c2', content: 'New comment' }));
  mount(<Comment />); await screen.findByText('Existing');
  fireEvent.change(screen.getByLabelText('Your comment'), { target: { value: 'New comment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByText('New comment')).toBeInTheDocument(); expect(screen.getByText('Existing')).toBeInTheDocument();
  expect(screen.getByLabelText('Your comment')).toHaveValue('');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ content: 'New comment', event_id: 'abc' });
});
test('failed comments preserve text', async () => {
  signIn(); fetch.mockImplementationOnce(() => reply([])).mockImplementationOnce(() => reply({}, false)); mount(<Comment />);
  await waitFor(() => expect(screen.queryByText('Loading comments…')).not.toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Your comment'), { target: { value: 'Keep this' } }); fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/text has been kept/); expect(screen.getByLabelText('Your comment')).toHaveValue('Keep this');
});
test('anonymous event detail omits credentials', async () => {
  fetch.mockImplementation((url) => reply(url.includes('/comments/') ? [] : { _id: 'abc', title: 'Public event', description: 'Details' })); await act(async () => { mount(<EventInfo />); });
  expect(await screen.findByText('Public event')).toBeInTheDocument(); await screen.findByRole('heading', { name: 'Comments' }); await waitFor(() => expect(screen.queryByText('Loading comments…')).not.toBeInTheDocument()); expect(fetch.mock.calls.every(([, options]) => !options.headers.Authorization)).toBe(true);
});
test('anonymous listing uses public endpoint', async () => {
  fetch.mockImplementation(() => reply([])); mount(<Event />); await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
  expect(fetch.mock.calls[0][0]).toMatch(/events\/public$/); expect(fetch.mock.calls[0][1].headers).toEqual({});
});
test('profile edits omit unchanged password', async () => {
  signIn(); fetch.mockImplementationOnce(() => reply({ user: { _id: account, name: 'Original', email: 'audit@example.com' } })).mockImplementationOnce(() => reply({}));
  mount(<Profil user={{ _id: account }} />); await screen.findByDisplayValue('Original');
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated' } }); fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByText('Profile saved.')).toBeInTheDocument(); expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ name: 'Updated', email: 'audit@example.com' });
});
test('profile failures retain edits', async () => {
  signIn(); fetch.mockImplementationOnce(() => reply({ user: { _id: account, name: 'Original', email: 'audit@example.com' } })).mockRejectedValueOnce(new Error('offline'));
  mount(<Profil user={{ _id: account }} />); await screen.findByDisplayValue('Original'); fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated' } }); fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/changes have been kept/); expect(screen.getByLabelText('Name')).toHaveValue('Updated');
});
test('event creation failures retain form and omit author', async () => {
  signIn(); fetch.mockResolvedValue({ ok: false }); mount(<EventCreate />); fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Keep event' } }); fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to create/); expect(screen.getByLabelText('title')).toHaveValue('Keep event'); expect(JSON.parse(fetch.mock.calls[0][1].body).creator).toBeUndefined();
});
test('failed event read displays an error and never mounts comments', async () => {
  fetch.mockRejectedValue(new Error('offline')); mount(<EventInfo />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load this event/);
  expect(screen.queryByRole('heading', { name: 'Comments' })).not.toBeInTheDocument();
});
test('unmounted event requests are aborted', () => {
  fetch.mockImplementation(() => new Promise(() => {})); const view = mount(<EventInfo />);
  const signal = fetch.mock.calls[0][1].signal; expect(signal.aborted).toBe(false);
  view.unmount(); expect(signal.aborted).toBe(true);
});
test('expired credentials are omitted from public listing', async () => {
  localStorage.setItem('token', `e30.${btoa(JSON.stringify({ _id: account, exp: 1 }))}.signature`);
  fetch.mockImplementation(() => reply([])); mount(<Event />);
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
  expect(fetch.mock.calls[0][0]).toMatch(/events\/public$/); expect(fetch.mock.calls[0][1].headers).toEqual({});
});
