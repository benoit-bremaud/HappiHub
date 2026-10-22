import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../session';
import { send } from '../accounts/request';
import { formatDate, STATUS_LABELS, typeLabel } from './eventFields';
import '../accounts/accounts.css';
import './events.css';

const FILTERS = [['', 'All'], ...Object.entries(STATUS_LABELS)];

/** Member list of the association's events with a status filter (UC16 step 1). */
export const EventListPage = () => {
  const { slug } = useParams();
  const { state } = useLocation();
  const { status: sessionStatus } = useSession();
  const [filter, setFilter] = useState('');
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return undefined;
    let current = true;
    (async () => {
      const { ok, data } = await send(`/associations/${slug}/events${filter ? `?status=${filter}` : ''}`);
      if (current) setResult(ok ? { events: data.events } : { failed: data.message ?? 'Unable to load the events.' });
    })();
    return () => { current = false; };
  }, [slug, filter, sessionStatus]);
  if (sessionStatus === 'anonymous') return <Navigate to="/signin" state={{ from: `/associations/${slug}/events` }} replace />;
  return (
    <section className="hh-page">
      <h2>Events</h2>
      {state?.notice && <p role="status">{state.notice}</p>}
      <p><Link className="hh-button" to={`/associations/${slug}/events/new`}>Create an event</Link></p>
      <div className="hh-chips" role="group" aria-label="Filter by status">
        {FILTERS.map(([key, label]) => (
          <button key={label} type="button" className={`hh-chip${filter === key ? ' hh-chip--on' : ''}`}
            aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {!result && <p role="status">Loading…</p>}
      {result?.failed && <p role="alert">{result.failed}</p>}
      {result?.events && (result.events.length ? (
        <ul className="hh-list hh-events" aria-label="Events">
          {result.events.map((event) => (
            <li key={event.id}>
              <Link to={`/associations/${slug}/events/${event.id}`}>{event.title}</Link>
              <span className="hh-badge">{STATUS_LABELS[event.status]}</span>
              {event.ended && <span className="hh-badge">Ended</span>}
              <span>{typeLabel(event.type)}</span>
              {event.startsAt && <span>{formatDate(event.startsAt)}</span>}
              <span className="hh-hint">Updated by {event.lastEditedBy ?? 'a former member'}</span>
            </li>
          ))}
        </ul>
      ) : <p>No events yet.</p>)}
      <p><Link to={`/associations/${slug}`}>Back to the association</Link></p>
    </section>
  );
};
