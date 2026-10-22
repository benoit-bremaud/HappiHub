import { useEffect, useId, useState } from 'react';
import { send } from '../accounts/request';

export const CITY_SEARCH_DELAY_MS = 250;

/** Decision K: city chosen from the server's commune reference; the stored value is the INSEE code. */
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
  return (
    <div className="hh-city">
      <label>City{code && <span className="hh-hint"> Selected: {name ?? code} <button type="button" className="hh-link"
        onClick={() => { onChange(null, null); onBlur?.(); }}>Clear</button></span>}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type at least 2 letters"
          aria-controls={listId} aria-invalid={invalid || undefined} />
      </label>
      {failed && <p role="alert" className="hh-error">City search unavailable. Try again.</p>}
      <ul id={listId} className="hh-list" aria-label="Cities found">
        {results.map((commune) => (
          <li key={commune.code}><button type="button" className="hh-button hh-secondary" onClick={() => pick(commune)}>
            {commune.name} ({commune.department})</button></li>
        ))}
      </ul>
    </div>
  );
};
