import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignUp, SignIn } from './AuthPages';
import { Header } from '../components/Header/Header';
import { useSession } from '../session';

jest.mock('../session', () => ({ useSession: jest.fn() }));

const reply = (status, body) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) });
beforeEach(() => {
  global.fetch = jest.fn();
  useSession.mockReturnValue({ account: null, status: 'anonymous', acceptSession: jest.fn(), refresh: jest.fn() });
});
afterEach(() => { delete global.fetch; });

const at = (element, state) => render(
  <MemoryRouter initialEntries={[{ pathname: '/', state }]}><Routes><Route path="/" element={element} /></Routes></MemoryRouter>);
const body = () => JSON.parse(fetch.mock.calls[0][1].body);

test('sign-up sends the association name and shows the neutral inbox message', async () => {
  fetch.mockReturnValue(reply(202, { message: 'Check your inbox to continue.', similarAssociation: false }));
  at(<SignUp />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.test' } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'a long enough passphrase' } });
  fireEvent.change(screen.getByLabelText('Association name'), { target: { value: 'Troupe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create my association' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox');
  expect(body()).toEqual({ email: 'ana@example.test', password: 'a long enough passphrase', associationName: 'Troupe' });
});

test('invitee sign-up (UC11 3a) has no association field and sends none', async () => {
  fetch.mockReturnValue(reply(202, { message: 'Check your inbox to continue.' }));
  at(<SignUp />, { email: 'malik@example.test', invited: true });
  expect(screen.queryByLabelText('Association name')).toBeNull();
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'a long enough passphrase' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create my account' }));
  await screen.findByRole('status');
  expect(body()).toEqual({ email: 'malik@example.test', password: 'a long enough passphrase' });
});

test('a rejected password is cleared and the hint shown', async () => {
  fetch.mockReturnValue(reply(400, { field: 'password', hint: 'Use 15 to 64 characters.' }));
  at(<SignUp />);
  const password = screen.getByLabelText(/^Password/);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.test' } });
  fireEvent.change(password, { target: { value: 'x'.repeat(15) } });
  fireEvent.change(screen.getByLabelText('Association name'), { target: { value: 'Troupe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create my association' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Use 15 to 64');
  expect(password).toHaveValue('');
});

test('sign-in failure shows a neutral error', async () => {
  fetch.mockReturnValue(reply(401, { message: 'Invalid email or password' }));
  at(<SignIn />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } });
  fireEvent.submit(screen.getByLabelText('Email').closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
});

test('header sign-out revokes the server session', async () => {
  const refresh = jest.fn();
  useSession.mockReturnValue({ status: 'authenticated', refresh });
  fetch.mockReturnValue(reply(204, {}));
  at(<Header />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  expect(fetch.mock.calls[0][0]).toMatch(/\/session$/);
});

test('signed-out header: the wordmark links Home, then Sign up and Sign in (visual design § 5.3)', () => {
  at(<Header />);
  expect(screen.getByRole('link', { name: 'HappiHub' })).toHaveAttribute('href', '/');
  expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['HappiHub', 'Sign up', 'Sign in']);
});
