import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Agenda } from './Agenda';

// Public agenda client criteria AC8–AC10 (public-agenda spec § 2). Only fetch is faked.

const API = 'http://localhost:5000/api';
let routes;
const card = (overrides = {}) => ({ id: 'a', status: 'PUBLISHED', title: 'Jazz night', type: 'CONCERT', shortDescription: 'Live',
  startsAt: '2026-11-05T19:00:00.000Z', endsAt: null, venueLabel: 'Hall', venueCity: { code: '69123', name: 'Lyon' },
  priceKind: 'FREE', priceAmountCents: null, posterStyle: 'classic', association: { name: 'Troupe', slug: 'troupe' },
  ...overrides });
const page = (items, extra = {}) => [200, { items, page: 1, pageSize: 20, hasMore: false, ...extra }];
const requested = () => fetch.mock.calls.map(([url]) => url.replace(API, ''));
const link = (title) => screen.findByRole('link', { name: new RegExp(title) });

beforeEach(() => {
  routes = {};
  global.fetch = jest.fn((url) => {
    const path = url.replace(API, '');
    if (!routes[path]) throw new Error(`Unexpected request ${path}`);
    const [status, body] = routes[path];
    return Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body), headers: { get: () => null } });
  });
});
afterEach(() => { delete global.fetch; });

const Location = () => <output data-testid="location">{useLocation().search}</output>;
const show = (entry = '/') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/" element={<><Agenda /><Location /></>} />
      <Route path="/events/:id" element={<p>Event page</p>} />
    </Routes>
  </MemoryRouter>);

test('cards show the poster essentials and a Cancelled badge, and open the event page (AC8)', async () => {
  routes['/events'] = page([card(), card({ id: 'b', title: 'Hamlet', type: 'THEATRE', status: 'CANCELLED',
    priceKind: 'AMOUNT', priceAmountCents: 1200 })]);
  show();
  const jazz = await link('Jazz night');
  expect(jazz).toHaveTextContent('Hall, Lyon');
  expect(jazz).toHaveTextContent('Free');
  expect(within(jazz).queryByText('Cancelled')).not.toBeInTheDocument();
  const hamlet = await link('Hamlet');
  expect(within(hamlet).getByText('Cancelled')).toBeInTheDocument();
  expect(hamlet).toHaveTextContent('Theatre');
  fireEvent.click(jazz);
  expect(await screen.findByText('Event page')).toBeInTheDocument();
});

test('filters stay hidden and the city list unfetched until "Filter" is opened (AC9)', async () => {
  routes['/events'] = page([card()]);
  show();
  await link('Jazz night');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(requested()).not.toContain('/events/cities');
});

test('type and city choices go to the URL and reset the page (AC9)', async () => {
  routes['/events?page=2'] = page([card({ title: 'Later' })], { page: 2 });
  routes['/events/cities'] = [200, [{ code: '69123', name: 'Lyon' }]];
  routes['/events?type=THEATRE'] = page([card({ title: 'Hamlet', type: 'THEATRE' })]);
  routes['/events?type=THEATRE&city=69123'] = page([]);
  show('/?page=2');
  await link('Later');
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Theatre' }));
  await link('Hamlet');
  expect(screen.getByTestId('location')).toHaveTextContent('?type=THEATRE');
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: '69123' } });
  expect(await screen.findByText(/No upcoming event matches these filters/)).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('?type=THEATRE&city=69123');
});

test('a shared filtered link restores the open panel and the choices (AC9)', async () => {
  routes['/events?type=THEATRE&city=69123'] = page([card({ title: 'Hamlet' })]);
  routes['/events/cities'] = [200, [{ code: '69123', name: 'Lyon' }]];
  show('/?type=THEATRE&city=69123');
  await link('Hamlet');
  expect(screen.getByRole('button', { name: 'Theatre' })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByRole('option', { name: 'Lyon' })).toBeInTheDocument();
  expect(screen.getByRole('combobox')).toHaveValue('69123');
});

test('Next goes to the following page', async () => {
  routes['/events'] = page([card()], { hasMore: true });
  routes['/events?page=2'] = page([card({ title: 'Later' })], { page: 2 });
  show();
  await link('Jazz night');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await link('Later');
  expect(screen.getByTestId('location')).toHaveTextContent('?page=2');
});

test('unknown or out-of-range URL parameters never reach the API', async () => {
  routes['/events?page=50'] = page([], { page: 50 });
  routes['/events'] = page([card()]);
  show('/?utm_source=x&page=99');
  fireEvent.click(await screen.findByRole('button', { name: 'Back to first page' }));
  await link('Jazz night');
  expect(requested()).toEqual(['/events?page=50', '/events']);
});

test('an empty filtered result offers to clear the filters (AC10)', async () => {
  routes['/events?type=DANCE'] = page([]);
  routes['/events'] = page([card()]);
  routes['/events/cities'] = [200, []];
  show('/?type=DANCE');
  fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
  await link('Jazz night');
  expect(screen.getByTestId('location')).toBeEmptyDOMElement();
});

test('an empty agenda without filters shows no "Clear filters" (AC10)', async () => {
  routes['/events'] = page([]);
  show();
  expect(await screen.findByText(/No upcoming event yet/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
});

test('a failed load can be retried', async () => {
  routes['/events'] = [500, {}];
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load events.');
  routes['/events'] = page([card()]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await link('Jazz night');
});
