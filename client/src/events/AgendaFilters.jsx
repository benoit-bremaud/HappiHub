import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { send } from '../accounts/request';
import { EVENT_TYPES } from './eventFields';

/**
 * UC21a filters behind one "Filter" button (public-agenda AC9, progressive disclosure). The
 * city list is fetched only once the panel is opened. It starts open when the URL already
 * holds a filter, so a shared link shows its active choice.
 */
export const AgendaFilters = ({ type, city, onChange }) => {
  const [open, setOpen] = useState(Boolean(type || city));
  const [cities, setCities] = useState([]);
  useEffect(() => {
    if (!open) return undefined;
    let current = true;
    void (async () => {
      const { ok, data } = await send('/events/cities');
      if (current && ok) setCities(data);
    })();
    return () => { current = false; };
  }, [open]);
  return (
    <div className="hh-agenda__filters">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Filter</button>
      {open && (
        <fieldset>
          <legend>Type</legend>
          {EVENT_TYPES.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={type === key}
              onClick={() => onChange({ type: type === key ? null : key, city })}>{label}</button>
          ))}
          <label>City{' '}
            <select value={city ?? ''} onChange={(e) => onChange({ type, city: e.target.value || null })}>
              <option value="">All cities</option>
              {cities.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
              {city && !cities.some(({ code }) => code === city) && <option value={city}>{city}</option>}
            </select>
          </label>
        </fieldset>
      )}
    </div>
  );
};
AgendaFilters.propTypes = { type: PropTypes.string, city: PropTypes.string, onChange: PropTypes.func.isRequired };
