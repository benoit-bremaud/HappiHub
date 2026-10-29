import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from '../session';
import { CITY_SEARCH_DELAY_MS } from './CityPicker';
import { EventEditorPage } from './EventEditorPage';
import { EventListPage } from './EventListPage';
import { PublicEventPage } from './PublicEventPage';
import { AUTOSAVE_DELAY_MS } from './useEventEditor';

jest.mock('../session', () => ({ useSession: jest.fn() }));

// Client acceptance criteria CC1–CC15 (client spec § 8). Only the API boundary (fetch) and the
// session context are faked; the editor hook, field rules and components run for real.

const API = 'http://localhost:5000/api';
const EVENTS = '/associations/troupe/events';
const ID = '11111111-2222-4333-8444-555555555555';
let routes;
const key = (url, options) => `${options?.method ?? 'GET'} ${url.replace(API, '')}`;
const calls = (prefix = '') => fetch.mock.calls.map(([url, options]) => key(url, options)).filter((call) => call.startsWith(prefix));
const bodies = (call) => fetch.mock.calls.filter(([url, options]) => key(url, options) === call).map(([, options]) => JSON.parse(options.body));
const session = (overrides = {}) => useSession.mockReturnValue({ status: 'authenticated', account: { id: 'me', email: 'claire@example.org' },
  refresh: jest.fn(), acceptSession: jest.fn(), ...overrides });

/** routes[key] is one answer or a list of answers consumed in order; the last one then repeats for later calls. */
beforeEach(() => {
  routes = {};
  global.fetch = jest.fn((url, options) => {
    const answers = routes[key(url, options)];
    const [status, body, headers = {}] = Array.isArray(answers?.[0]) ? (answers.length > 1 ? answers.shift() : answers[0])
      : answers ?? [404, { message: `No route ${key(url, options)}` }];
    if (status === 0) return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body), headers: { get: (name) => headers[name] ?? null } });
  });
  session();
});
afterEach(() => { delete global.fetch; jest.useRealTimers(); });

const event = (overrides = {}) => ({
  id: ID, status: 'DRAFT', version: 1, title: 'Concert', type: 'CONCERT', shortDescription: 'Live music',
  longDescription: null, startsAt: '2030-06-01T18:00:00.000Z', endsAt: null, ended: false, venueLabel: 'Hall',
  venueAddress: null, venueCity: { code: '69123', name: 'Lyon' }, priceKind: 'FREE', priceAmountCents: null,
  posterStyle: 'classic', cancellationReason: null, publishedAt: null, scheduleChangedAt: null, lastEditedBy: 'Claire', ...overrides,
});

const Where = () => { const location = useLocation(); return <p data-testid="where">{location.pathname}{location.search}</p>; };
const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/associations/:slug/events" element={<><EventListPage /><Where /></>} />
      <Route path="/associations/:slug/events/new" element={<><EventEditorPage /><Where /></>} />
      <Route path="/associations/:slug/events/:id" element={<><EventEditorPage /><Where /></>} />
      <Route path="/events/:id" element={<PublicEventPage />} />
      <Route path="/signin" element={<p>Sign-in page</p>} />
    </Routes>
  </MemoryRouter>);

const openEditor = async (step, current = event()) => {
  routes[`GET ${EVENTS}/${ID}`] = [200, current];
  renderAt(`${EVENTS}/${ID}${step ? `?step=${step}` : ''}`);
  await screen.findByRole('navigation', { name: 'Steps' });
};
const edit = (label, value) => {
  const input = screen.getByLabelText(label, { exact: false });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe('create and save (UC15, UC16)', () => {
  test('CC1: the draft is created once with title and type, then the URL becomes the event', async () => {
    routes[`POST ${EVENTS}`] = [201, event({ shortDescription: null })];
    renderAt(`${EVENTS}/new`);
    expect(screen.queryByLabelText('Concert')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Steps' })).toBeNull();
    edit('Title', 'Concert');
    expect(calls('POST')).toEqual([]);
    expect(screen.queryByLabelText('Short description', { exact: false })).toBeNull();
    fireEvent.click(screen.getByLabelText('Concert'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`${EVENTS}/${ID}?step=1`));
    expect(bodies(`POST ${EVENTS}`)).toEqual([{ title: 'Concert', type: 'CONCERT' }]);
    expect(calls(`GET ${EVENTS}/${ID}`)).toEqual([]);
  });

  test('CC2: saves carry the loaded version and base; the next save uses the new version', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [[200, event({ version: 2, title: 'Concert 2' })], [200, event({ version: 3, title: 'Concert 3' })]];
    await openEditor(1);
    edit('Title', 'Concert 2');
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    edit('Title', 'Concert 3');
    await waitFor(() => expect(bodies(`PATCH ${EVENTS}/${ID}`)).toHaveLength(2));
    expect(bodies(`PATCH ${EVENTS}/${ID}`)).toEqual([
      { baseVersion: 1, changes: { title: 'Concert 2' }, base: { title: 'Concert' } },
      { baseVersion: 2, changes: { title: 'Concert 3' }, base: { title: 'Concert 2' } },
    ]);
  });

  test('autosave fires after a pause in typing (decision AS-A)', async () => {
    jest.useFakeTimers();
    routes[`PATCH ${EVENTS}/${ID}`] = [200, event({ version: 2, title: 'New' })];
    await openEditor(1);
    fireEvent.change(screen.getByLabelText('Title', { exact: false }), { target: { value: 'New' } });
    expect(screen.getByText('Changes not saved yet')).toBeInTheDocument();
    await act(async () => { jest.advanceTimersByTime(AUTOSAVE_DELAY_MS); });
    expect(calls('PATCH')).toHaveLength(1);
  });

  test('a published event says the change is visible immediately; merged changes of others are shown', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [200, event({ status: 'PUBLISHED', version: 2, title: 'Mine', shortDescription: 'Theirs' })];
    await openEditor(1, event({ status: 'PUBLISHED' }));
    edit('Title', 'Mine');
    expect(await screen.findByText('Saved ✓ — visible immediately')).toBeInTheDocument();
    expect(screen.getByLabelText('Short description', { exact: false })).toHaveValue('Theirs');
  });

  test('CC3: a network failure keeps the input and Retry sends the same change', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [[0], [200, event({ version: 2, title: 'Kept' })]];
    await openEditor(1);
    edit('Title', 'Kept');
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
    expect(screen.getByLabelText('Title', { exact: false })).toHaveValue('Kept');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    expect(bodies(`PATCH ${EVENTS}/${ID}`).map((b) => b.changes)).toEqual([{ title: 'Kept' }, { title: 'Kept' }]);
  });

  test('field refusals from the API are shown inline on the field', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [400, { message: 'Invalid characters', code: 'INVALID_FIELD', details: { field: 'title' } }];
    await openEditor(1);
    edit('Title', 'Bad');
    expect(await screen.findByText('Invalid characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Title', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  });

  test('a published event refuses to lose a required field (UC16 2c)', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [422, { message: 'x', code: 'PUBLISHED_FIELD_REQUIRED', details: { fields: ['shortDescription'] } }];
    await openEditor(1, event({ status: 'PUBLISHED' }));
    edit('Short description', '');
    expect(await screen.findByText('Required while the event is published.')).toBeInTheDocument();
  });

  test('a local rule blocks the save and explains inline', async () => {
    await openEditor(1);
    edit('Short description', 'x'.repeat(281));
    expect(await screen.findByText('At most 280 characters.')).toBeInTheDocument();
    expect(calls('PATCH')).toEqual([]);
  });
});

describe('conflicts and session (UC17, UC15 *b)', () => {
  test('CC4: yours/theirs per field; the choice is resent with the current version; a second conflict keeps only the remaining field', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [
      [409, { code: 'EDIT_CONFLICT', message: 'x', details: { conflicts: [{ field: 'title', yours: 'Mine', theirs: 'Malik title' }], lastEditedBy: 'Malik', version: 4 } }],
      [409, { code: 'EDIT_CONFLICT', message: 'x', details: { conflicts: [{ field: 'title', yours: 'Mine', theirs: 'Again' }], lastEditedBy: 'Malik', version: 5 } }],
      [200, event({ version: 6, title: 'Mine' })]];
    await openEditor(1);
    edit('Title', 'Mine');
    const panel = await screen.findByRole('alertdialog', { name: 'Edit conflict' });
    expect(within(panel).getByText('Malik changed the same fields meanwhile')).toBeInTheDocument();
    fireEvent.click(within(panel).getByLabelText(/Yours: Mine/));
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply my choices' }));
    const again = await screen.findByRole('alertdialog', { name: 'Edit conflict' });
    expect(within(again).getByLabelText(/Theirs: Again/)).toBeInTheDocument();
    fireEvent.click(within(again).getByLabelText(/Yours: Mine/));
    fireEvent.click(within(again).getByRole('button', { name: 'Apply my choices' }));
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    expect(bodies(`PATCH ${EVENTS}/${ID}`).slice(1)).toEqual([
      { baseVersion: 4, changes: { title: 'Mine' }, base: { title: 'Malik title' } },
      { baseVersion: 5, changes: { title: 'Mine' }, base: { title: 'Again' } },
    ]);
  });

  test('choosing theirs drops my change and reloads the event', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [409, { code: 'EDIT_CONFLICT', message: 'x',
      details: { conflicts: [{ field: 'title', yours: 'Mine', theirs: 'Malik title' }], lastEditedBy: null, version: 4 } }];
    await openEditor(1);
    routes[`GET ${EVENTS}/${ID}`] = [200, event({ version: 4, title: 'Malik title' })];
    edit('Title', 'Mine');
    const panel = await screen.findByRole('alertdialog');
    expect(within(panel).getByText('Another member changed the same fields meanwhile')).toBeInTheDocument();
    fireEvent.click(within(panel).getByLabelText(/Theirs/));
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply my choices' }));
    await waitFor(() => expect(screen.getByLabelText('Title', { exact: false })).toHaveValue('Malik title'));
    expect(calls('PATCH')).toHaveLength(1);
  });

  test('CC5: a 401 keeps the input, signs in in place, never retries by itself, then saves on request', async () => {
    const acceptSession = jest.fn();
    session({ acceptSession });
    routes[`PATCH ${EVENTS}/${ID}`] = [[401, { message: 'Authentication required' }], [200, event({ version: 2, title: 'Kept' })]];
    routes['POST /session'] = [200, { account: { id: 'me' }, csrfToken: 'new' }];
    await openEditor(1);
    edit('Title', 'Kept');
    const form = await screen.findByRole('form', { name: 'Sign in again' });
    edit('Title', 'Kept more');
    expect(calls('PATCH')).toHaveLength(1);
    fireEvent.change(within(form).getByLabelText(/Password/), { target: { value: 'a long enough passphrase' } });
    fireEvent.submit(form);
    await waitFor(() => expect(acceptSession).toHaveBeenCalled());
    expect(bodies('POST /session')).toEqual([{ email: 'claire@example.org', password: 'a long enough passphrase' }]);
    await screen.findByText('Saved ✓');
    expect(bodies(`PATCH ${EVENTS}/${ID}`)[1].changes).toEqual({ title: 'Kept more' });
  });

  test('a 403 renews the session token and offers Retry', async () => {
    const refresh = jest.fn();
    session({ refresh });
    routes[`PATCH ${EVENTS}/${ID}`] = [403, { message: 'Forbidden' }];
    await openEditor(1);
    edit('Title', 'X');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  test('CC12: the creation quota tells when creation is possible again', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2030, 0, 1, 9, 15).getTime());
    routes[`POST ${EVENTS}`] = [429, { code: 'EVENT_QUOTA', message: 'Creation quota reached.' }, { 'Retry-After': '3600' }];
    renderAt(`${EVENTS}/new`);
    edit('Title', 'Talk');
    fireEvent.click(screen.getByLabelText('Talk'));
    expect(await screen.findByText('Creation quota reached. Creation is possible again at 10:15.')).toBeInTheDocument();
    Date.now.mockRestore();
  });

  test('other rate limits ask to wait', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [429, { message: 'Too many' }, { 'Retry-After': '30' }];
    await openEditor(1);
    edit('Title', 'X');
    expect(await screen.findByText('Too many requests. Wait 30 seconds, then retry.')).toBeInTheDocument();
  });

  test('a removed member or deleted event shows the not-found message', async () => {
    routes[`GET ${EVENTS}/${ID}`] = [404, { code: 'EVENT_NOT_FOUND', message: 'Event not found' }];
    renderAt(`${EVENTS}/${ID}`);
    expect(await screen.findByText(/no longer exists or you are no longer a member/)).toBeInTheDocument();
  });

  test('an anonymous visitor is sent to sign in', () => {
    session({ status: 'anonymous', account: null });
    renderAt(`${EVENTS}/new`);
    expect(screen.getByText('Sign-in page')).toBeInTheDocument();
  });
});

describe('steps (UC15 5–9)', () => {
  test('decision R: without a step the editor opens at the first incomplete step', async () => {
    await openEditor(null, event({ startsAt: null }));
    expect(screen.getByRole('button', { name: '2. When and where?' })).toHaveAttribute('aria-current', 'step');
  });

  test('CC6: a past start warns at step 2 and the draft still saves', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [200, event({ version: 2, startsAt: '2001-01-01T10:00:00.000Z' })];
    await openEditor(2);
    edit('Start', '2001-01-01T10:00');
    expect(await screen.findByText(/This start is in the past/)).toBeInTheDocument();
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    expect(bodies(`PATCH ${EVENTS}/${ID}`)[0].changes.startsAt).toMatch(/^2001-01-01/);
  });

  test('CC13: the city picker searches the reference and stores the INSEE code', async () => {
    jest.useFakeTimers();
    routes['GET /communes?q=vill'] = [200, { communes: [{ code: '69266', name: 'Villeurbanne', department: '69' }] }];
    routes[`PATCH ${EVENTS}/${ID}`] = [200, event({ version: 2, venueCity: { code: '69266', name: 'Villeurbanne' } })];
    await openEditor(2, event({ venueCity: null }));
    fireEvent.change(screen.getByPlaceholderText('Type at least 2 letters'), { target: { value: 'vill' } });
    await act(async () => { jest.advanceTimersByTime(CITY_SEARCH_DELAY_MS); });
    fireEvent.click(await screen.findByRole('button', { name: 'Villeurbanne (69)' }));
    await waitFor(() => expect(bodies(`PATCH ${EVENTS}/${ID}`)).toHaveLength(1));
    expect(bodies(`PATCH ${EVENTS}/${ID}`)[0]).toEqual({ baseVersion: 1, changes: { venueCity: '69266' }, base: { venueCity: null } });
    expect(screen.getByText(/City: Villeurbanne/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type at least 2 letters')).toBeNull();
  });

  test('city search failures are reported; short queries do not call the API', async () => {
    jest.useFakeTimers();
    routes['GET /communes?q=ly'] = [503, { message: 'down' }];
    await openEditor(2, event({ venueCity: null }));
    const input = screen.getByPlaceholderText('Type at least 2 letters');
    fireEvent.change(input, { target: { value: 'l' } });
    await act(async () => { jest.advanceTimersByTime(CITY_SEARCH_DELAY_MS); });
    expect(calls('GET /communes')).toEqual([]);
    fireEvent.change(input, { target: { value: 'ly' } });
    await act(async () => { jest.advanceTimersByTime(CITY_SEARCH_DELAY_MS); });
    expect(await screen.findByText('City search unavailable. Try again.')).toBeInTheDocument();
  });

  test('price: a fixed amount is sent in cents; another kind clears it', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [200, event({ version: 2, priceKind: 'AMOUNT', priceAmountCents: 1250 })];
    await openEditor(2);
    expect(screen.queryByLabelText('Fixed price')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change the price' }));
    fireEvent.click(screen.getByLabelText('Fixed price'));
    expect(calls('PATCH')).toEqual([]);
    edit('Amount in euros', '12,50');
    await waitFor(() => expect(bodies(`PATCH ${EVENTS}/${ID}`).at(-1).changes).toEqual({ priceKind: 'AMOUNT', priceAmountCents: 1250 }));
    fireEvent.click(screen.getByLabelText('Free'));
    await waitFor(() => expect(bodies(`PATCH ${EVENTS}/${ID}`).at(-1).changes).toEqual({ priceKind: 'FREE', priceAmountCents: null }));
  });

  test('step 3 picks a poster style by its human label (C5); Next moves to the following step', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [200, event({ version: 2, posterStyle: 'night' })];
    await openEditor(3);
    expect(screen.queryByLabelText('night')).toBeNull();
    fireEvent.click(screen.getByLabelText('Night'));
    await waitFor(() => expect(bodies(`PATCH ${EVENTS}/${ID}`)[0].changes).toEqual({ posterStyle: 'night' }));
    expect(screen.getByLabelText('Poster preview')).toHaveClass('hh-poster--night');
    fireEvent.click(screen.getByRole('button', { name: 'Next: Preview' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?step=4');
  });

  test('CC15: markup typed by the member is shown as text', async () => {
    await openEditor(1, event({ title: '<img src=x onerror=alert(1)>' }));
    expect(within(screen.getByLabelText('Poster preview')).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('lifecycle (UC18–UC20)', () => {
  test('CC7: publish refusals link to the step and offer to resend the verification email', async () => {
    routes[`POST ${EVENTS}/${ID}/publish`] = [422, { code: 'PUBLICATION_REFUSED', message: 'x',
      details: { failures: ['START_IN_PAST', 'EMAIL_NOT_VERIFIED'] } }];
    routes['POST /email-verification/resend'] = [202, {}];
    await openEditor(4);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/The start must be in the future to publish/)).toBeInTheDocument();
    expect(bodies(`POST ${EVENTS}/${ID}/publish`)).toEqual([{ baseVersion: 1 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Resend the verification email' }));
    expect(await screen.findByText(/Verification email sent/)).toBeInTheDocument();
    expect(bodies('POST /email-verification/resend')).toEqual([{ email: 'claire@example.org' }]);
    fireEvent.click(screen.getByRole('button', { name: 'go to step 2' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?step=2');
  });

  test('the checklist links to the incomplete step and Publish appears only when complete', async () => {
    await openEditor(4, event({ shortDescription: null }));
    expect(screen.getByText(/Short description is missing/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'complete step 1' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?step=1');
  });

  test('CC8: a successful publish shows the public link', async () => {
    routes[`POST ${EVENTS}/${ID}/publish`] = [200, event({ status: 'PUBLISHED', version: 2 })];
    await openEditor(4);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText(/can still edit or cancel it at any time/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Published. It can be edited or cancelled at any time.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\/events\/11111111/ })).toHaveAttribute('href', `/events/${ID}`);
  });

  test('a stale version reloads and asks to confirm again', async () => {
    routes[`POST ${EVENTS}/${ID}/publish`] = [409, { code: 'STALE_VERSION', message: 'x' }];
    await openEditor(4);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('The event changed meanwhile. Check it and confirm again.')).toBeInTheDocument();
    expect(calls(`GET ${EVENTS}/${ID}`)).toHaveLength(2);
  });

  test('CC9: cancel needs the dialog, sends the reason with confirm, then the event is read-only', async () => {
    routes[`POST ${EVENTS}/${ID}/cancel`] = [200, event({ status: 'CANCELLED', version: 3, cancellationReason: 'Storm' })];
    await openEditor(4, event({ status: 'PUBLISHED', version: 2 }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this event' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this event?' });
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep the event' }));
    expect(calls('POST')).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this event' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add a reason for the public' }));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: ' Storm ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel the event' }));
    expect(await screen.findByText(/This event is cancelled and can no longer be edited. Reason: Storm/)).toBeInTheDocument();
    expect(screen.getByText('Event cancelled.')).toBeInTheDocument();
    expect(bodies(`POST ${EVENTS}/${ID}/cancel`)).toEqual([{ baseVersion: 2, confirm: true, reason: 'Storm' }]);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  test('an ended published event cannot be cancelled', async () => {
    await openEditor(4, event({ status: 'PUBLISHED', ended: true }));
    expect(screen.queryByRole('button', { name: 'Cancel this event' })).toBeNull();
  });

  test('CC10: delete is offered for drafts, needs confirmation and returns to the list', async () => {
    routes[`POST ${EVENTS}/${ID}/delete`] = [204, {}];
    routes[`GET ${EVENTS}`] = [200, { events: [] }];
    await openEditor(4);
    fireEvent.click(screen.getByRole('button', { name: 'Delete this draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete the draft' }));
    expect(await screen.findByText('Draft deleted.')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(new RegExp(`^${EVENTS}$`));
    expect(bodies(`POST ${EVENTS}/${ID}/delete`)).toEqual([{ baseVersion: 1, confirm: true }]);
  });

  test('a published event offers no delete', async () => {
    await openEditor(4, event({ status: 'PUBLISHED' }));
    expect(screen.queryByRole('button', { name: 'Delete this draft' })).toBeNull();
  });

  test.each(['ARCHIVED', 'CANCELLED'])('CC11: a %s event is read-only and writes nothing', async (status) => {
    routes[`GET ${EVENTS}/${ID}`] = [200, event({ status })];
    renderAt(`${EVENTS}/${ID}`);
    expect(await screen.findByText(/can no longer be edited/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(calls().filter((call) => !call.startsWith('GET'))).toEqual([]);
  });

  test('a write refused as read-only switches to the read-only view', async () => {
    routes[`PATCH ${EVENTS}/${ID}`] = [409, { code: 'EVENT_READ_ONLY', message: 'x' }];
    await openEditor(1);
    routes[`GET ${EVENTS}/${ID}`] = [200, event({ status: 'CANCELLED', cancellationReason: null })];
    edit('Title', 'Late');
    expect(await screen.findByText(/This event is cancelled and can no longer be edited/)).toBeInTheDocument();
  });
});

describe('list and public page', () => {
  test('the member list filters by status', async () => {
    routes[`GET ${EVENTS}`] = [200, { events: [{ id: ID, title: 'Concert', type: 'CONCERT', status: 'PUBLISHED', startsAt: '2030-06-01T18:00:00.000Z', ended: true, lastEditedBy: null, lastEditedByFormerMember: true },
      { id: 'nameless', title: 'Nameless', type: 'TALK', status: 'DRAFT', startsAt: null, ended: false, lastEditedBy: null, lastEditedByFormerMember: false },
      { id: 'other', title: '<b>Talk</b>', type: 'TALK', status: 'DRAFT', startsAt: null, ended: false, lastEditedBy: 'Claire' }] }];
    routes[`GET ${EVENTS}?status=DRAFT`] = [200, { events: [] }];
    renderAt(EVENTS);
    expect(await screen.findByRole('link', { name: 'Concert' })).toHaveAttribute('href', `${EVENTS}/${ID}`);
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.getByText('Updated by a former member')).toBeInTheDocument();
    expect(screen.getByText('Updated by a member')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '<b>Talk</b>' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }));
    expect(await screen.findByText('No events yet.')).toBeInTheDocument();
  });

  test('a single event needs no filter', async () => {
    routes[`GET ${EVENTS}`] = [200, { events: [{ id: ID, title: 'Solo', type: 'TALK', status: 'DRAFT', startsAt: null, ended: false, lastEditedBy: 'Claire' }] }];
    renderAt(EVENTS);
    await screen.findByRole('link', { name: 'Solo' });
    expect(screen.queryByRole('group', { name: 'Filter by status' })).toBeNull();
  });

  test('a list failure is reported', async () => {
    routes[`GET ${EVENTS}`] = [404, { message: 'Association not found' }];
    renderAt(EVENTS);
    expect(await screen.findByText('Association not found')).toBeInTheDocument();
  });

  test('CC14: public page — not found, cancelled banner with reason, schedule change', async () => {
    routes[`GET /events/${ID}`] = [200, { ...event({ status: 'CANCELLED', cancellationReason: 'Storm', scheduleChangedAt: '2030-05-01T10:00:00.000Z',
      longDescription: 'Line 1\nLine 2', title: '<script>x</script>' }), lastEditedBy: undefined, association: { name: 'Troupe', slug: 'troupe' } }];
    renderAt(`/events/${ID}`);
    expect(await screen.findByText('This event is cancelled. Storm')).toBeInTheDocument();
    // C4 (#302): the banner says it once; the poster on this page carries no badge.
    expect(screen.queryAllByText(/cancelled/i)).toHaveLength(1);
    expect(screen.getByText(/By Troupe · Updated on .*May 2030/)).toBeInTheDocument();
    expect(screen.getByText('<script>x</script>')).toBeInTheDocument();
    expect(screen.queryByText(/Claire/)).toBeNull();
    expect(screen.getByText(/Line 1/)).toHaveClass('hh-long');
  });

  test('public page 404', async () => {
    routes[`GET /events/${ID}`] = [404, { code: 'EVENT_NOT_FOUND', message: 'Event not found' }];
    renderAt(`/events/${ID}`);
    expect(await screen.findByText('Event not found.')).toBeInTheDocument();
  });
});
