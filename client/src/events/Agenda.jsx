import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { send } from '../accounts/request';
import { AgendaFilters } from './AgendaFilters';
import { EventPoster } from './EventPoster';
import { fromServer } from './eventFields';
import './events.css';

/** UC21 public agenda: upcoming events as cards, filters and page held in the URL (AC8–AC10). */
export const Agenda = () => {
  const [params, setParams] = useSearchParams();
  const type = params.get('type');
  const city = params.get('city');
  const page = Number(params.get('page')) || 1;
  const query = params.toString();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setResult(null);
    void (async () => {
      const { ok, data } = await send(`/events${query ? `?${query}` : ''}`);
      if (current) setResult(ok ? data : { failed: true });
    })();
    return () => { current = false; };
  }, [query, attempt]);

  /** Writes the non-empty values to the URL; any filter change goes back to page 1. */
  const navigate = (next) => setParams(Object.fromEntries(Object.entries({ type, city, page: null, ...next })
    .filter(([, value]) => value !== null && value !== 1)));

  return (
    <section className="hh-agenda" aria-labelledby="agenda-title">
      <h2 id="agenda-title">Upcoming events</h2>
      <AgendaFilters type={type} city={city} onChange={(filters) => navigate(filters)} />
      {!result && <output>Loading…</output>}
      {result?.failed && <p role="alert">Unable to load events.{' '}
        <button type="button" onClick={() => setAttempt(attempt + 1)}>Retry</button></p>}
      {result?.items?.length === 0 && (
        <p>No upcoming event{type || city ? ' matches these filters' : ' yet'}.{' '}
          {(type || city) && <button type="button" onClick={() => navigate({ type: null, city: null })}>Clear filters</button>}
        </p>
      )}
      {result?.items?.length > 0 && (
        <>
          <ul className="hh-agenda__list">
            {result.items.map((event) => (
              <li key={event.id}>
                <Link to={`/events/${event.id}`} aria-label={event.title}>
                  <EventPoster values={fromServer(event)} cityName={event.venueCity?.name}
                    cancelled={event.status === 'CANCELLED'} />
                </Link>
              </li>
            ))}
          </ul>
          <nav className="hh-agenda__pages" aria-label="Agenda pages">
            {page > 1 && <button type="button" onClick={() => navigate({ page: page - 1 })}>Previous</button>}
            {result.hasMore && <button type="button" onClick={() => navigate({ page: page + 1 })}>Next</button>}
          </nav>
        </>
      )}
    </section>
  );
};
