import { formatDate, priceLabel, typeLabel } from './eventFields';

/** Live poster preview shared by the editor steps and the public page (UC15 2–6). Plain text only. */
export const EventPoster = ({ values, cityName, cancelled = false }) => (
  <article className={`hh-poster hh-poster--${values.posterStyle ?? 'classic'}`} aria-label="Poster preview">
    {cancelled && <p className="hh-poster__banner">Cancelled</p>}
    <p className="hh-poster__type">{typeLabel(values.type) || 'Type'}</p>
    <h3 className="hh-poster__title">{values.title || 'Your event title'}</h3>
    {values.startsAt && <p>{formatDate(values.startsAt)}{values.endsAt && ` – ${formatDate(values.endsAt)}`}</p>}
    {(values.venueLabel || cityName) && <p>{[values.venueLabel, cityName].filter(Boolean).join(', ')}</p>}
    <p>{priceLabel(values)}</p>
    {values.shortDescription && <p className="hh-poster__summary">{values.shortDescription}</p>}
  </article>
);
