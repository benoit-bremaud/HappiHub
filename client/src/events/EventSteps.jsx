import { useState } from 'react';
import { CityPicker } from './CityPicker';
import { FieldError } from './FieldError';
import {
  centsToEuros, eurosToCents, EVENT_TYPES, fromLocalInput, isPast, MAX_LENGTHS, POSTER_STYLES, PRICE_KINDS,
  priceLabel, toLocalInput,
} from './eventFields';

// Steps 1–3 of the editor (client spec § 2). Progressive disclosure (owner rule 2026-10-22):
// each field appears once the previous choice is made, optional fields behind an "Add …" link.

/** Text or textarea bound to one editor field; saves on blur (decision AS-A). */
const Field = ({ editor, field, label, as = 'input', ...props }) => {
  const Tag = as;
  const max = MAX_LENGTHS[field];
  const value = editor.values[field] ?? '';
  return (
    <label>{label}
      <Tag value={value} onChange={(e) => editor.change(field, e.target.value === '' ? null : e.target.value)}
        onBlur={editor.save} aria-invalid={editor.problem?.field === field || undefined} {...props} />
      {max && value.length > max * 0.8 && <span className="hh-hint">{value.length} / {max}</span>}
      <FieldError problem={editor.problem} fields={[field]} />
    </label>
  );
};

/** An optional field: a link until the member asks for it, or as soon as it holds a value. */
const Optional = ({ shown, label, children }) => {
  const [open, setOpen] = useState(false);
  if (shown || open) return children;
  return <button type="button" className="hh-link hh-add" onClick={() => setOpen(true)}>+ {label}</button>;
};

/** One choice among a closed list; picking saves at once. */
const Chips = ({ editor, field, legend, options }) => (
  <fieldset className="hh-chips"><legend>{legend}</legend>
    {options.map(([key, label]) => (
      <label key={key}><input type="radio" name={field} checked={editor.values[field] === key}
        onChange={() => { editor.change(field, key); if (field !== 'priceKind' || key !== 'AMOUNT') editor.save(); }} /> {label}</label>
    ))}
  </fieldset>
);

const DateField = ({ editor, field, label }) => (
  <label>{label}<input type="datetime-local" value={toLocalInput(editor.values[field])}
    // A partly typed date reports '' with badInput: keep the stored value until it is complete.
    onChange={(e) => { if (!e.target.validity?.badInput) editor.change(field, fromLocalInput(e.target.value)); }}
    onBlur={editor.save} />
    <FieldError problem={editor.problem} fields={[field]} />
  </label>
);

/** Euro text kept locally while typing; it follows the stored cents when they change elsewhere (conflict, reload). */
const AmountField = ({ editor }) => {
  const cents = editor.values.priceAmountCents;
  const [text, setText] = useState(centsToEuros(cents));
  const shown = eurosToCents(text) === cents ? text : centsToEuros(cents);
  return (
    <label>Amount in euros<input inputMode="decimal" value={shown}
      onChange={(e) => { setText(e.target.value); editor.change('priceAmountCents', eurosToCents(e.target.value)); }} onBlur={editor.save} />
      <FieldError problem={editor.problem} fields={['priceAmountCents', 'priceKind']} /></label>
  );
};

export const StepWhat = ({ editor }) => {
  const { values } = editor;
  return (
    <>
      <Field editor={editor} field="title" label="Title" maxLength={MAX_LENGTHS.title} required autoFocus />
      {(values.title || values.type) && <Chips editor={editor} field="type" legend="Type" options={EVENT_TYPES} />}
      {(values.type || values.shortDescription) && <Field editor={editor} field="shortDescription" label="Short description" as="textarea" rows={3} />}
    </>
  );
};

export const StepWhere = ({ editor, cityName, setCityName }) => {
  const { values } = editor;
  const [priceOpen, setPriceOpen] = useState(false);
  return (
    <>
      <DateField editor={editor} field="startsAt" label="Start" />
      {isPast(values.startsAt) && <p role="status" className="hh-warning">This start is in the past. The draft is saved, but the start must be in the future to publish.</p>}
      {values.startsAt && <Optional shown={values.endsAt} label="Add an end time"><DateField editor={editor} field="endsAt" label="End" /></Optional>}
      {(values.startsAt || values.venueLabel) && <Field editor={editor} field="venueLabel" label="Venue" maxLength={MAX_LENGTHS.venueLabel} />}
      {(values.venueLabel || values.venueCity) && (
        <CityPicker code={values.venueCity} name={cityName} invalid={editor.problem?.field === 'venueCity'}
          onChange={(code, name) => { setCityName(name); editor.change('venueCity', code); }} onBlur={editor.save} />)}
      {values.venueLabel && <Optional shown={values.venueAddress} label="Add an address">
        <Field editor={editor} field="venueAddress" label="Address" maxLength={MAX_LENGTHS.venueAddress} /></Optional>}
      {values.venueCity && (priceOpen || values.priceKind !== 'FREE'
        ? <Chips editor={editor} field="priceKind" legend="Price" options={PRICE_KINDS} />
        : <p>Price: {priceLabel(values)} <button type="button" className="hh-link" aria-label="Change the price" onClick={() => setPriceOpen(true)}>Change</button></p>)}
      {values.priceKind === 'AMOUNT' && <AmountField editor={editor} />}
    </>
  );
};

export const StepLook = ({ editor }) => (
  <>
    <Chips editor={editor} field="posterStyle" legend="Poster style" options={POSTER_STYLES.map((style) => [style, style])} />
    <Optional shown={editor.values.longDescription} label="Add a longer description">
      <Field editor={editor} field="longDescription" label="Long description" as="textarea" rows={8} />
    </Optional>
  </>
);
