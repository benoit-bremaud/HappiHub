import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { send } from '../accounts/request';
import { AgendaFilters } from './AgendaFilters';
import { EventPoster } from './EventPoster';
import { dayHeading, formatDate, fromServer } from './eventFields';
import './events.css';

/** Groups the page's events by local start day, keeping the API's `startsAt` order (V3). */
const byDay = (items) => items.reduce((days, event) => {
  const key = new Date(event.startsAt).toDateString();
  const last = days.at(-1);
  if (last?.key === key) last.events.push(event);
  else days.push({ key, heading: dayHeading(event.startsAt), events: [event] });
  return days;
}, []);

/** UC21 public agenda: upcoming events as cards, filters and page held in the URL (AC8–AC10). */
export const Agenda = () => {
  const [params, setParams] = useSearchParams();
  const type = params.get('type');
  const city = params.get('city');
  // Only the parsed filters reach the API, so a tracker parameter or a bad page cannot break it.
  const page = Math.min(Math.max(Number.parseInt(params.get('page'), 10) || 1, 1), 50);
  const query = new URLSearchParams(Object.entries({ type, city, page: page > 1 ? page : null })
    .filter(([, value]) => value !== null)).toString();
  const path = query ? `/events?${query}` : '/events';
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setResult(null);
    void (async () => {
      const { ok, data } = await send(path);
      if (current) setResult(ok ? data : { failed: true });
    })();
    return () => { current = false; };
  }, [path, attempt]);

  /** Writes the non-empty values to the URL; any filter change goes back to page 1. */
  const navigate = (next) => setParams(Object.fromEntries(Object.entries({ type, city, page: null, ...next })
    .filter(([, value]) => value !== null && value !== 1)));

  return (
    <section className="hh-agenda" aria-labelledby="agenda-title">
      <h2 id="agenda-title">Upcoming events</h2>
      <AgendaFilters type={type} city={city} onChange={navigate} />
      {!result && <output>Loading…</output>}
      {result?.failed && <p role="alert">Unable to load events.{' '}
        <button type="button" onClick={() => setAttempt(attempt + 1)}>Retry</button></p>}
      {result?.items?.length === 0 && (
        <p>No upcoming event{type || city ? ' matches these filters' : ' yet'}.{' '}
          {(type || city) && <button type="button" onClick={() => navigate({ type: null, city: null })}>Clear filters</button>}
          {page > 1 && <button type="button" onClick={() => navigate({ page: null })}>Back to first page</button>}
        </p>
      )}
      {result?.items?.length > 0 && (
        <>
          <div className="hh-agenda__days">
          {byDay(result.items).map(({ key, heading, events }) => (
            <section key={key} className="hh-agenda__day" aria-label={heading}>
              <h3 className="hh-agenda__day-title">{heading}</h3>
              <ul className="hh-agenda__list">
                {events.map((event) => (
                  <li key={event.id}>
                    {/* The poster is labelled "Poster preview"; the link names what a listener needs. */}
                    <Link to={`/events/${event.id}`} aria-label={[event.title, formatDate(event.startsAt), event.venueCity?.name,
                      event.status === 'CANCELLED' && 'cancelled'].filter(Boolean).join(', ')}>
                      <EventPoster values={fromServer(event)} cityName={event.venueCity?.name}
                        cancelled={event.status === 'CANCELLED'} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          </div>
          <nav className="hh-agenda__pages" aria-label="Agenda pages">
            {page > 1 && <button type="button" onClick={() => navigate({ page: page - 1 })}>Previous</button>}
            {result.hasMore && <button type="button" onClick={() => navigate({ page: page + 1 })}>Next</button>}
          </nav>
        </>
      )}
    </section>
  );
};
