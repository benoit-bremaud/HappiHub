// Pure field rules of the event editor (client spec § 5). They mirror the API allow-list so the
// form explains problems inline; the server stays the authority and re-validates every write.

export const EVENT_TYPES = [
  ['THEATRE', 'Theatre'], ['CONCERT', 'Concert'], ['EXHIBITION', 'Exhibition'], ['WORKSHOP', 'Workshop'],
  ['DANCE', 'Dance'], ['CINEMA', 'Cinema'], ['TALK', 'Talk'], ['OTHER', 'Other'],
];
/** Poster style keys (stored values) with their human labels (agenda visual design C5). */
export const POSTER_STYLES = [['classic', 'Classic'], ['bold', 'Bold'], ['paper', 'Paper'], ['night', 'Night'],
  ['pastel', 'Pastel'], ['minimal', 'Minimal']];
export const PRICE_KINDS = [['FREE', 'Free'], ['AMOUNT', 'Fixed price'], ['PAY_WHAT_YOU_WANT', 'Pay what you want']];
export const STATUS_LABELS = { DRAFT: 'Draft', PUBLISHED: 'Published', CANCELLED: 'Cancelled', ARCHIVED: 'Archived' };

export const FIELD_LABELS = {
  title: 'Title', type: 'Type', shortDescription: 'Short description', longDescription: 'Long description',
  startsAt: 'Start', endsAt: 'End', venueLabel: 'Venue', venueAddress: 'Address', venueCity: 'City',
  priceKind: 'Price', priceAmountCents: 'Amount', posterStyle: 'Poster style',
};
export const EDITABLE_FIELDS = Object.keys(FIELD_LABELS);
export const REQUIRED_FIELDS = ['title', 'type', 'shortDescription', 'startsAt', 'venueLabel', 'venueCity'];
export const MAX_LENGTHS = { title: 120, shortDescription: 280, longDescription: 10000, venueLabel: 200, venueAddress: 200 };
export const REASON_MAX = 500;

export const STEPS = [
  { number: 1, title: 'What?', fields: ['title', 'type', 'shortDescription'] },
  { number: 2, title: 'When and where?', fields: ['startsAt', 'endsAt', 'venueLabel', 'venueAddress', 'venueCity', 'priceKind', 'priceAmountCents'] },
  { number: 3, title: 'Look', fields: ['posterStyle', 'longDescription'] },
  { number: 4, title: 'Preview', fields: [] },
];

export const stepOf = (field) => STEPS.find((step) => step.fields.includes(field))?.number ?? 1;

/** Form values in the API representation; the city is its INSEE code. */
export const emptyValues = () => ({
  ...Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, null])), priceKind: 'FREE', posterStyle: POSTER_STYLES[0][0],
});

/** Editable values of a member or public event view (`venueCity` comes back as `{code, name}`). */
export const fromServer = (event) => ({
  ...Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, event[field] ?? null])),
  venueCity: event.venueCity?.code ?? null,
});

const blank = (value) => value === null || value === undefined || value === '';

/** Inline problem of one field given all values, or null (UC15 3a, 5a). */
export const fieldProblem = (field, values) => {
  const value = values[field];
  if (['title', 'type'].includes(field) && blank(value)) return `${FIELD_LABELS[field]} is required.`;
  if (MAX_LENGTHS[field] && (value ?? '').length > MAX_LENGTHS[field]) return `At most ${MAX_LENGTHS[field]} characters.`;
  if (field === 'endsAt' && value && values.startsAt && Date.parse(value) < Date.parse(values.startsAt))
    return 'The end must be after the start.';
  if (field === 'priceAmountCents' && values.priceKind === 'AMOUNT' && (value ?? 0) <= 0) return 'Enter an amount above zero.';
  return null;
};

/** Publication checklist (G1 mirror): the missing required fields with the step to complete. */
export const missingRequired = (values) => REQUIRED_FIELDS.filter((field) => blank(values[field]))
  .map((field) => ({ field, label: FIELD_LABELS[field], step: stepOf(field) }));

/** Decision R: resume at the first step still incomplete, otherwise the preview. */
export const entryStep = (values) => missingRequired(values)[0]?.step ?? 4;

/** True when the instant is at or before `now` (epoch ms): a start "now" already counts as past (E2). */
export const isPast = (iso, now = Date.now()) => Boolean(iso) && Date.parse(iso) <= now;

/** UC18 3a–3c: one line per refusal of `details.failures`, with the step that fixes it. */
export const describeFailure = (failure) => {
  if (failure.startsWith('MISSING_FIELD:')) {
    const field = failure.slice('MISSING_FIELD:'.length);
    return { text: `${FIELD_LABELS[field] ?? field} is missing.`, step: stepOf(field) };
  }
  if (failure === 'START_IN_PAST') return { text: 'The start must be in the future to publish.', step: 2 };
  if (failure === 'EMAIL_NOT_VERIFIED') return { text: 'Verify your email address before publishing.', resend: true };
  return { text: failure };
};

const pad = (number) => String(number).padStart(2, '0');

/** ISO instant → `datetime-local` value in the browser's zone. */
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** `datetime-local` value → ISO instant with an explicit zone (the API refuses zone-less dates). */
export const fromLocalInput = (local) => (local ? new Date(local).toISOString() : null);

/** 1250 → "12.50"; no amount → empty text for the input. */
export const centsToEuros = (cents) => (cents === null || cents === undefined ? '' : (cents / 100).toFixed(2));

/** "12,50" or "12.5" → 1250; anything not a number → null. */
export const eurosToCents = (text) => {
  const amount = Number(String(text).replace(',', '.').trim());
  return text === '' || !Number.isFinite(amount) ? null : Math.round(amount * 100);
};

/** Display date in the fixed en-GB format of the current English UI; empty input gives ''. */
/** Display locale of every event date (#304 will revisit it). */
const LOCALE = 'en-GB';

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleString(LOCALE, {
  weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '');

const dayPart = (date) => date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const timePart = (date) => date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });

/** Poster date line; a same-day range shows the date once: "Sat, 14 November 2026, 20:00 – 23:00" (C7). */
export const formatRange = (startsAt, endsAt) => {
  if (!startsAt) return '';
  if (!endsAt) return formatDate(startsAt);
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return start.toDateString() === end.toDateString()
    ? `${dayPart(start)}, ${timePart(start)} – ${timePart(end)}`
    : `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
};

/** Agenda day heading in local time: "Saturday 31 October" (V3). */
export const dayHeading = (iso) => new Date(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

/** Short month of the poster date block: "Nov". */
export const monthShort = (iso) => new Date(iso).toLocaleDateString(LOCALE, { month: 'short' });

/** Poster price line; a fixed price without a positive amount reads "Price to be set". */
export const priceLabel = ({ priceKind, priceAmountCents }) => {
  if (priceKind === 'AMOUNT') return priceAmountCents > 0 ? `€${centsToEuros(priceAmountCents)}` : 'Price to be set';
  return priceKind === 'PAY_WHAT_YOU_WANT' ? 'Pay what you want' : 'Free';
};

export const typeLabel = (type) => EVENT_TYPES.find(([key]) => key === type)?.[1] ?? '';
