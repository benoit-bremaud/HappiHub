import { useState } from 'react';
import { FIELD_LABELS, formatDate, priceLabel, typeLabel } from './eventFields';

const show = (field, value) => {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (field === 'startsAt' || field === 'endsAt') return formatDate(value);
  if (field === 'type') return typeLabel(value);
  if (field === 'priceAmountCents') return priceLabel({ priceKind: 'AMOUNT', priceAmountCents: value });
  return String(value);
};

/** UC17: for each conflicting field, the member keeps their value or takes the other member's. */
export const ConflictPanel = ({ conflict, onResolve }) => {
  const [choices, setChoices] = useState({});
  const complete = conflict.conflicts.every(({ field }) => choices[field]);
  return (
    <section className="hh-conflict" role="alertdialog" aria-label="Edit conflict">
      <h3>{conflict.lastEditedBy ?? 'Another member'} changed the same fields meanwhile</h3>
      <p>Nothing is lost until you choose, field by field.</p>
      {conflict.conflicts.map(({ field, yours, theirs }) => (
        <fieldset key={field}>
          <legend>{FIELD_LABELS[field] ?? field}</legend>
          <label><input type="radio" name={`conflict-${field}`} checked={choices[field] === 'yours'}
            onChange={() => setChoices({ ...choices, [field]: 'yours' })} /> Yours: {show(field, yours)}</label>
          <label><input type="radio" name={`conflict-${field}`} checked={choices[field] === 'theirs'}
            onChange={() => setChoices({ ...choices, [field]: 'theirs' })} /> Theirs: {show(field, theirs)}</label>
        </fieldset>
      ))}
      <button type="button" className="hh-button" disabled={!complete} onClick={() => onResolve(choices)}>Apply my choices</button>
    </section>
  );
};
