import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { send } from '../accounts/request';
import { EventPoster } from './EventPoster';
import { formatDate, fromServer } from './eventFields';
import '../accounts/accounts.css';
import './events.css';

/** Minimal public page of a published, cancelled or archived event (UC18 4, UC19 4). */
export const PublicEventPage = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  useEffect(() => {
    let current = true;
    (async () => {
      const { ok, status, data } = await send(`/events/${id}`);
      if (current) setResult(ok ? { event: data } : { failed: status === 404 ? 'Event not found.' : 'Unable to load the event. Try again later.' });
    })();
    return () => { current = false; };
  }, [id]);
  if (!result) return <section className="hh-page"><p role="status">Loading…</p></section>;
  if (result.failed) return <section className="hh-page"><p role="alert">{result.failed}</p></section>;
  const { event } = result;
  const cancelled = event.status === 'CANCELLED';
  return (
    <section className="hh-page">
      {cancelled && <p role="status" className="hh-banner">This event is cancelled.{event.cancellationReason && ` ${event.cancellationReason}`}</p>}
      {event.ended && !cancelled && <p role="status" className="hh-banner">This event has ended.</p>}
      <EventPoster values={fromServer(event)} cityName={event.venueCity?.name} cancelled={cancelled} />
      {event.venueAddress && <p>{event.venueAddress}</p>}
      {event.longDescription && <p className="hh-long">{event.longDescription}</p>}
      <p className="hh-hint">By {event.association.name}
        {event.scheduleChangedAt && ` · Updated on ${formatDate(event.scheduleChangedAt)}`}</p>
    </section>
  );
};
