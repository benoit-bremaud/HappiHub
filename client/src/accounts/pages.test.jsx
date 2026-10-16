import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPassword, ResetPassword, VerifyEmail } from './AuthPages';
import { AccountPage } from './AccountPage';
import { AssociationPage } from './AssociationPage';
import { InvitationPage } from './InvitationPage';
import { useSession } from '../session';

jest.mock('../session', () => ({ useSession: jest.fn() }));

// Fake API boundary: "METHOD /path" → [status, body]; every call is recorded.
let routes;
const calls = () => fetch.mock.calls.map(([url, options]) =>
  `${options?.method ?? 'GET'} ${url.replace('http://localhost:5000/api', '')}`);
const bodyOf = (call) => JSON.parse(fetch.mock.calls.find(([url, o]) =>
  `${o?.method ?? 'GET'} ${url.replace('http://localhost:5000/api', '')}` === call)[1].body);
const session = (overrides = {}) => useSession.mockReturnValue({
  status: 'authenticated', account: { id: 'me' }, refresh: jest.fn(), acceptSession: jest.fn(), ...overrides });

beforeEach(() => {
  routes = {};
  global.fetch = jest.fn((url, options) => {
    const key = `${options?.method ?? 'GET'} ${url.replace('http://localhost:5000/api', '')}`;
    const [status, body] = routes[key] ?? [404, { message: `No route ${key}` }];
    return Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) });
  });
  window.history.replaceState(null, '', '/');
  sessionStorage.clear();
  session();
});
afterEach(() => { delete global.fetch; jest.restoreAllMocks(); });

const renderAt = (path, element, pattern = path.split('#')[0]) => render(
  <MemoryRouter initialEntries={[path.split('#')[0]]}>
    <Routes>
      <Route path={pattern} element={element} />
      <Route path="/account" element={<p>Account page</p>} />
      <Route path="/signin" element={<p>Sign-in page</p>} />
      <Route path="/" element={<p>Home page</p>} />
      <Route path="/associations/:slug" element={<p>Association page</p>} />
    </Routes>
  </MemoryRouter>);
const withFragment = (token) => window.history.replaceState(null, '', `/page#${token}`);

describe('VerifyEmail (UC2, S1-C)', () => {
  test('waits for the session bootstrap before posting, then asks to sign in', async () => {
    withFragment('verify-token');
    session({ status: 'loading' });
    routes['POST /email-verification'] = [200, { signedIn: false }];
    const view = renderAt('/verify-email', <VerifyEmail />);
    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
    session({ status: 'anonymous' });
    view.rerender(<MemoryRouter initialEntries={['/verify-email']}><Routes><Route path="/verify-email" element={<VerifyEmail />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Your email address is verified.')).toBeInTheDocument();
    expect(bodyOf('POST /email-verification')).toEqual({ token: 'verify-token' });
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('under StrictMode the token is still read once and sent (QA regression)', async () => {
    withFragment('strict-token');
    session({ status: 'anonymous' });
    routes['POST /email-verification'] = [200, { signedIn: false }];
    render(<StrictMode><MemoryRouter><VerifyEmail /></MemoryRouter></StrictMode>);
    await screen.findByText('Your email address is verified.');
    expect(bodyOf('POST /email-verification')).toEqual({ token: 'strict-token' });
  });

  test('an invalid link offers to send a new one', async () => {
    session({ status: 'anonymous' });
    routes['POST /email-verification'] = [410, { message: 'This link is expired.' }];
    routes['POST /email-verification/resend'] = [202, { message: 'Check your inbox to continue.' }];
    renderAt('/verify-email', <VerifyEmail />);
    expect(await screen.findByRole('alert')).toHaveTextContent('This link is expired.');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'v@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a new link' }));
    expect(await screen.findByText('Check your inbox to continue.')).toBeInTheDocument();
  });
});

describe('ResetPassword and ForgotPassword (UC3)', () => {
  test('the fragment token is sent with the new password, then the account opens', async () => {
    const refresh = jest.fn();
    session({ status: 'anonymous', refresh });
    withFragment('reset-token');
    routes['POST /password-reset/confirm'] = [200, { csrfToken: 'x' }];
    renderAt('/reset-password', <ResetPassword />);
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'a long new sentence ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and sign in' }));
    expect(await screen.findByText('Account page')).toBeInTheDocument();
    expect(bodyOf('POST /password-reset/confirm')).toEqual({ token: 'reset-token', password: 'a long new sentence ok' });
    expect(refresh).toHaveBeenCalled();
  });

  test('a rejected password shows the hint and offers to start again', async () => {
    routes['POST /password-reset/confirm'] = [400, { hint: 'Use 15 to 64 characters.' }];
    renderAt('/reset-password', <ResetPassword />);
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'x'.repeat(15) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use 15 to 64');
    expect(screen.getByRole('link', { name: 'Start again' })).toBeInTheDocument();
  });

  test('forgot password shows the neutral answer', async () => {
    routes['POST /password-reset'] = [202, { message: 'Check your inbox to continue.' }];
    renderAt('/forgot-password', <ForgotPassword />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'p@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox');
  });
});

describe('InvitationPage (UC11)', () => {
  const invitation = { associationName: 'Troupe', associationSlug: 'troupe', email: 'm@example.test' };

  test('waits for the session, prefers a fresh link and joins on an explicit choice', async () => {
    sessionStorage.setItem('invitationToken', 'old-token');
    withFragment('new-token');
    session({ status: 'loading' });
    routes['POST /invitations/lookup'] = [200, invitation];
    routes['POST /invitations/accept'] = [200, { status: 'JOINED', associationSlug: 'troupe' }];
    const view = renderAt('/invitations', <InvitationPage />);
    expect(fetch).not.toHaveBeenCalled();
    session();
    view.rerender(<MemoryRouter initialEntries={['/invitations']}><Routes>
      <Route path="/invitations" element={<InvitationPage />} />
      <Route path="/associations/:slug" element={<p>Association page</p>} />
    </Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Join' }));
    expect(await screen.findByText('Association page')).toBeInTheDocument();
    expect(bodyOf('POST /invitations/lookup')).toEqual({ token: 'new-token' });
    expect(sessionStorage.getItem('invitationToken')).toBeNull();
  });

  test('anonymous visitors get sign-in and invitee sign-up links; the token is kept for the tab', async () => {
    session({ status: 'anonymous' });
    withFragment('tok');
    routes['POST /invitations/lookup'] = [200, invitation];
    renderAt('/invitations', <InvitationPage />);
    expect(await screen.findByRole('link', { name: 'create an account' })).toBeInTheDocument();
    expect(sessionStorage.getItem('invitationToken')).toBe('tok');
  });

  test('a different address shows the masked hint from the server', async () => {
    withFragment('tok');
    routes['POST /invitations/lookup'] = [200, invitation];
    routes['POST /invitations/accept'] = [403, { message: 'This invitation is for m•••@example.test.' }];
    renderAt('/invitations', <InvitationPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('m•••@example.test');
  });

  test('an invalid link shows one neutral message and forgets the stored token', async () => {
    sessionStorage.setItem('invitationToken', 'stale');
    routes['POST /invitations/lookup'] = [410, { message: 'This invitation is no longer valid.' }];
    renderAt('/invitations', <InvitationPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer valid');
    expect(sessionStorage.getItem('invitationToken')).toBeNull();
  });
});

describe('AccountPage (UC4–UC6, UC11 4c)', () => {
  const account = {
    id: 'me', email: 'me@example.test', emailVerified: true, pendingEmail: null, displayName: 'Me',
    associations: [{ name: 'Troupe', slug: 'troupe', status: 'ACTIVE' }],
    invitations: [{ id: 'inv-1', associationName: 'Choir', associationSlug: 'choir' }],
    soleMemberOf: [{ name: 'Troupe', slug: 'troupe' }],
  };
  beforeEach(() => { routes['GET /account'] = [200, account]; });

  test('anonymous visitors are sent to sign-in', () => {
    session({ status: 'anonymous' });
    renderAt('/account-page', <AccountPage />);
    expect(screen.getByText('Sign-in page')).toBeInTheDocument();
  });

  test('pending invitations are joined by id', async () => {
    routes['POST /invitations/accept'] = [200, { status: 'JOINED', associationSlug: 'choir' }];
    renderAt('/account-page', <AccountPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join' }));
    expect(await screen.findByRole('link', { name: 'Open the association' })).toBeInTheDocument();
    expect(bodyOf('POST /invitations/accept')).toEqual({ invitationId: 'inv-1' });
  });

  test('an email change asks for and sends the current password', async () => {
    routes['PATCH /account'] = [200, { ...account, pendingEmail: 'new@example.test' }];
    renderAt('/account-page', <AccountPage />);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'new@example.test' } });
    fireEvent.change(within(screen.getByRole('form', { name: 'My account' })).getByLabelText('Current password'), { target: { value: 'my current sentence' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Confirm the new address/)).toBeInTheDocument();
    expect(bodyOf('PATCH /account')).toEqual({ displayName: 'Me', email: 'new@example.test', currentPassword: 'my current sentence' });
  });

  test('a wrong current password is reported', async () => {
    routes['PATCH /account'] = [403, { message: 'The current password is incorrect.' }];
    renderAt('/account-page', <AccountPage />);
    fireEvent.change(await screen.findByLabelText(/^New password/), { target: { value: 'another long sentence' } });
    fireEvent.change(within(screen.getByRole('form', { name: 'My account' })).getByLabelText('Current password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/incorrect/)).toHaveAttribute('role', 'alert');
  });

  test('a new association is created and the list reloads', async () => {
    routes['POST /associations'] = [201, { name: 'Choir', slug: 'choir' }];
    renderAt('/account-page', <AccountPage />);
    fireEvent.change(await screen.findByLabelText('Association name'), { target: { value: 'Choir' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create an association' }));
    expect(await screen.findByText('Created Choir.')).toBeInTheDocument();
    expect(calls().filter((c) => c === 'GET /account')).toHaveLength(2);
  });

  test('the export downloads a JSON file, and its limit is reported', async () => {
    URL.createObjectURL = jest.fn(() => 'blob:x');
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    routes['GET /account/export'] = [200, { account: {} }];
    renderAt('/account-page', <AccountPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Export my data' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    routes['GET /account/export'] = [429, { message: 'Export limit reached.' }];
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }));
    expect(await screen.findByText('Export limit reached.')).toHaveAttribute('role', 'alert');
  });

  test('deletion lists sole-member associations and sends password and confirmation', async () => {
    const refresh = jest.fn();
    session({ refresh });
    routes['DELETE /account'] = [204, {}];
    renderAt('/account-page', <AccountPage />);
    expect(await screen.findByText(/last member of these associations/)).toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'Delete my account' });
    const deleteButton = screen.getByRole('button', { name: 'Delete my account' });
    expect(deleteButton).toBeDisabled();
    fireEvent.change(form.querySelector('input[type="password"]'), { target: { value: 'my current sentence' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(deleteButton);
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(bodyOf('DELETE /account')).toEqual({ password: 'my current sentence', confirm: true });
    expect(refresh).toHaveBeenCalled();
  });
});

describe('AssociationPage (UC7, UC8, UC10, UC12)', () => {
  const association = {
    name: 'Troupe', slug: 'troupe', city: 'Lyon', presentation: '', websiteUrl: '', contactEmail: '', status: 'ACTIVE',
    members: [{ accountId: 'me', email: 'me@example.test', displayName: 'Me' },
      { accountId: 'other', email: 'o@example.test', displayName: null }],
  };
  const open = () => renderAt('/associations/troupe', <AssociationPage />, '/associations/:slug');
  beforeEach(() => {
    routes['GET /associations/troupe'] = [200, association];
    routes['GET /associations/troupe/invitations'] = [200, { invitations: [{ id: 'i1', email: 'p@example.test' }] }];
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  test('a member is removed after confirmation; the current account has no remove button', async () => {
    routes['DELETE /associations/troupe/members/other'] = [204, {}];
    open();
    const buttons = await screen.findAllByRole('button', { name: 'Remove' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(calls()).toContain('DELETE /associations/troupe/members/other'));
    expect(window.confirm).toHaveBeenCalledWith('Remove o@example.test?');
  });

  test('a refused action shows the server message', async () => {
    routes['POST /associations/troupe/close'] = [409, { message: 'Other members remain.' }];
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Close the association' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Other members remain.');
    expect(bodyOf('POST /associations/troupe/close')).toEqual({ confirm: true });
  });

  test('cancelling the confirmation sends nothing', async () => {
    window.confirm.mockReturnValue(false);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Leave the association' }));
    expect(calls()).not.toContain('POST /associations/troupe/leave');
  });

  test('leaving returns to the account page', async () => {
    routes['POST /associations/troupe/leave'] = [204, {}];
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Leave the association' }));
    expect(await screen.findByText('Account page')).toBeInTheDocument();
  });

  test('the profile saves the text fields', async () => {
    routes['PATCH /associations/troupe'] = [200, {}];
    open();
    fireEvent.change(await screen.findByLabelText('City'), { target: { value: 'Paris' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save the profile' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(bodyOf('PATCH /associations/troupe')).toMatchObject({ name: 'Troupe', city: 'Paris' });
  });

  test('inviting shows the link; resend and revoke act on pending invitations', async () => {
    routes['POST /associations/troupe/invitations'] = [201, { email: 'n@example.test', link: 'http://x/invitations#t' }];
    routes['POST /associations/troupe/invitations/i1/resend'] = [200, { link: 'http://x/invitations#u' }];
    routes['DELETE /associations/troupe/invitations/i1'] = [204, {}];
    open();
    fireEvent.change(await screen.findByLabelText('Email to invite'), { target: { value: 'n@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Invitation sent to n@example.test.')).toBeInTheDocument();
    expect(screen.getByLabelText('Invitation link')).toHaveValue('http://x/invitations#t');
    fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
    expect(await screen.findByText('Invitation sent again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Invitation link')).toHaveValue('http://x/invitations#u');
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByText('Invitation revoked.')).toBeInTheDocument();
  });

  test('a closed association is read-only; a non-member sees the error', async () => {
    routes['GET /associations/troupe'] = [200, { ...association, status: 'CLOSED' }];
    const view = open();
    expect(await screen.findByText('Troupe (closed)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    view.unmount();
    routes['GET /associations/troupe'] = [404, { message: 'Not found' }];
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Not found');
  });
});
