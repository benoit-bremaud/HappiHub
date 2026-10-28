import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Agenda } from './Agenda';

// Public agenda client criteria AC8–AC10 (public-agenda spec § 2). Only fetch is faked.

const API = 'http://localhost:5000/api';
const ID = '11111111-2222-4333-8444-555555555555';
let routes;
const card = (overrides = {}) => ({ id: ID, status: 'PUBLISHED', title: 'Concert', type: 'CONCERT', shortDescription: 'Live',
  startsAt: '2026-11-05T19:00:00.000Z', endsAt: null, venueLabel: 'Hall', venueCity: { code: '69123', name: 'Lyon' },
  priceKind: 'FREE', priceAmountCents: null, posterStyle: 'classic', association: { name: 'Troupe', slug: 'troupe' },
  ...overrides });
const page = (items, extra = {}) => [200, { items, page: 1, pageSize: 20, hasMore: false, ...extra }];

beforeEach(() => {
  routes = {};
  global.fetch = jest.fn((url) => {
    const [status, body] = routes[url.replace(API, '')] ?? [404, {}];
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

test('lists cards with a Cancelled badge and opens the event page (AC8)', async () => {
  routes['/events'] = page([card(), card({ id: 'b', title: 'Play', status: 'CANCELLED' })]);
  show();
  expect(await screen.findByRole('link', { name: 'Concert' })).toBeInTheDocument();
  expect(within(screen.getByRole('link', { name: 'Play' })).getByText('Cancelled')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Concert' }));
  expect(await screen.findByText('Event page')).toBeInTheDocument();
});

test('filters are hidden until "Filter" is opened, then held in the URL (AC9)', async () => {
  routes['/events'] = page([card()], { hasMore: true });
  routes['/events/cities'] = [200, [{ code: '69123', name: 'Lyon' }]];
  routes['/events?type=THEATRE'] = page([card({ title: 'Hamlet', type: 'THEATRE' })]);
  routes['/events?type=THEATRE&city=69123'] = page([]);
  routes['/events?page=2'] = page([card({ title: 'Later' })], { page: 2 });
  show();
  await screen.findByRole('link', { name: 'Concert' });
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalledWith(`${API}/events/cities`, expect.anything());

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByRole('link', { name: 'Later' })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('?page=2');

  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Theatre' }));
  expect(await screen.findByRole('link', { name: 'Hamlet' })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('?type=THEATRE');
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: '69123' } });
  expect(await screen.findByText(/No upcoming event matches these filters/)).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('?type=THEATRE&city=69123');
});

test('an empty filtered result offers to clear the filters (AC10)', async () => {
  routes['/events?type=DANCE'] = page([]);
  routes['/events'] = page([card()]);
  routes['/events/cities'] = [200, []];
  show('/?type=DANCE');
  fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
  expect(await screen.findByRole('link', { name: 'Concert' })).toBeInTheDocument();
});

test('a failed load can be retried', async () => {
  routes['/events'] = [500, {}];
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load events.');
  routes['/events'] = page([card()]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('link', { name: 'Concert' })).toBeInTheDocument();
});
