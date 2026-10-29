import PropTypes from 'prop-types';
import { valuesShape } from './propShapes';
import { formatRange, priceLabel, typeLabel } from './eventFields';

/** Day numeral and short month of the poster's date block; the full date is in the text below. */
const DateBlock = ({ startsAt }) => {
  const date = new Date(startsAt);
  return (
    <p className="hh-poster__date" aria-hidden="true">
      <span className="hh-poster__day">{date.getDate()}</span>
      <span className="hh-poster__month">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
    </p>
  );
};
DateBlock.propTypes = { startsAt: PropTypes.string.isRequired };

/**
 * Poster shared by the agenda cards, the public page and the editor preview (UC15 2–6, agenda
 * visual design § 5, V8). Plain text only. `cancelled` shows the badge; the public page leaves
 * it off because its banner already says so (A1, #302).
 */
export const EventPoster = ({ values, cityName, cancelled = false }) => (
  <article className={`hh-poster hh-poster--${values.posterStyle ?? 'classic'}`} aria-label="Poster preview">
    <div className="hh-poster__head">
      {values.startsAt && <DateBlock startsAt={values.startsAt} />}
      <p className="hh-poster__type">{typeLabel(values.type) || 'Type'}</p>
      {cancelled && <p className="hh-poster__banner">Cancelled</p>}
    </div>
    <h3 className="hh-poster__title">{values.title || 'Your event title'}</h3>
    {values.startsAt && <p>{formatRange(values.startsAt, values.endsAt)}</p>}
    {(values.venueLabel || cityName) && <p>{[values.venueLabel, cityName].filter(Boolean).join(', ')}</p>}
    <p>{priceLabel(values)}</p>
    {values.shortDescription && <p className="hh-poster__summary">{values.shortDescription}</p>}
  </article>
);
EventPoster.propTypes = { values: valuesShape.isRequired, cityName: PropTypes.string, cancelled: PropTypes.bool };
