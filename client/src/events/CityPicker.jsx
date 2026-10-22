import PropTypes from 'prop-types';
import { useEffect, useId, useState } from 'react';
import { send } from '../accounts/request';

export const CITY_SEARCH_DELAY_MS = 250;

/**
 * Decision K: city chosen from the server's commune reference; the stored value is the INSEE code.
 * The search waits CITY_SEARCH_DELAY_MS after typing. `onChange(code, name)` reports a pick, and
 * `(null, null)` a cleared city; once chosen only the name and "Change" stay visible.
 */
export const CityPicker = ({ code, name, onChange, onBlur, invalid }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [failed, setFailed] = useState(false);
  const listId = useId();
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return undefined; }
    let current = true;
    const timer = setTimeout(async () => {
      const { ok, data } = await send(`/communes?q=${encodeURIComponent(query.trim())}`);
      if (!current) return;
      setFailed(!ok);
      setResults(ok ? data.communes : []);
    }, CITY_SEARCH_DELAY_MS);
    return () => { current = false; clearTimeout(timer); };
  }, [query]);
  const pick = (commune) => { onChange(commune.code, commune.name); setQuery(''); setResults([]); onBlur?.(); };
  if (code) return (
    <p className="hh-city">City: {name ?? code} <button type="button" className="hh-link" aria-label="Change the city" onClick={() => { onChange(null, null); onBlur?.(); }}>Change</button></p>
  );
  return (
    <div className="hh-city">
      <label>City<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type at least 2 letters"
        aria-controls={listId} aria-invalid={invalid || undefined} /></label>
      {failed && <p role="alert" className="hh-error">City search unavailable. Try again.</p>}
      {results.length > 0 && <ul id={listId} className="hh-list" aria-label="Cities found">
        {results.map((commune) => (
          <li key={commune.code}><button type="button" className="hh-button hh-secondary" onClick={() => pick(commune)}>
            {commune.name} ({commune.department})</button></li>
        ))}
      </ul>}
    </div>
  );
};
CityPicker.propTypes = { code: PropTypes.string, name: PropTypes.string, onChange: PropTypes.func.isRequired, onBlur: PropTypes.func, invalid: PropTypes.bool };
