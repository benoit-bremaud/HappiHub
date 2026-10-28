import Joi from 'joi';
import { findCommune } from './communes.js';
import { DomainError } from './errors.js';

// Brick B event rules (spec v1-brick-b-event-lifecycle): field validation and allow-list (§ 7),
// merge M (§ 5), publication guard G1/G3 (§ 4), lifecycle transitions, effective end A1 and
// the creation quota window Q. Pure functions: persistence and locking live in services/events.js.

/** One day in milliseconds (A1 fallback end, quota window Q). */
export const DAY_MS = 24 * 3600e3;
/** Allowed `type` values (§ 7); mirrored by the migration CHECK. */
export const EVENT_TYPES = ['THEATRE', 'CONCERT', 'EXHIBITION', 'WORKSHOP', 'DANCE', 'CINEMA', 'TALK', 'OTHER'];
/** Poster presets; the first one is the creation default. */
export const POSTER_STYLES = ['classic', 'bold', 'paper', 'night', 'pastel', 'minimal'];
/** `priceKind` values; only AMOUNT carries `priceAmountCents`. */
export const PRICE_KINDS = ['FREE', 'AMOUNT', 'PAY_WHAT_YOU_WANT'];
/** Lifecycle statuses, also the member list filter values. */
export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'];
/** Q: creations per association within a sliding 24 h window. */
export const CREATION_QUOTA = 20;
/** M step 6: EVENT_EDITED entries of one actor on one event within this many ms coalesce. */
export const COALESCE_MS = 15 * 60e3;
/** S2: days a flagged draft stays before deletion, unless edited. */
export const DRAFT_NOTICE_GRACE_MS = 14 * DAY_MS;

/** G1: fields a published event must keep (UC18, UC16 2c). */
export const REQUIRED_FIELDS = ['title', 'type', 'shortDescription', 'startsAt', 'venueLabel', 'venueCity'];
const SCHEDULE_FIELDS = new Set(['startsAt', 'endsAt', 'venueLabel', 'venueAddress', 'venueCity']);
const READ_ONLY = new Set(['CANCELLED', 'ARCHIVED']);

/** Refusal with the brick B body `{message, code, details?}`. */
export const eventError = (status, code, message, details) =>
  new DomainError(status, message, { code, ...(details && { details }) });

/** Q refusal: 429 with `Retry-After` (seconds) until a creation slot frees. */
export const quotaError = (retryAfter) => new DomainError(429,
  `This association has created ${CREATION_QUOTA} events in the last 24 hours.`, { code: 'EVENT_QUOTA', retryAfter });

// No control, invisible formatting (bidi overrides, zero-width) or line/paragraph separator
// characters in single-line text; long descriptions keep line breaks and tabs.
const SINGLE_LINE = /^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]*$/u;
const MULTI_LINE = /^(?:[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|[\t\n\r])*$/u;
const optionalText = (max, pattern = SINGLE_LINE) =>
  Joi.string().trim().max(max).pattern(pattern).allow(null).empty('').default(null);
/** UC19 cancellation reason: optional single-line text. */
export const cancellationReasonSchema = optionalText(500);

// ISO 8601 date-time with an explicit zone; impossible calendar dates (Feb 30) are refused
// instead of rolling over, and numbers are not accepted as dates.
const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const isoDateTime = Joi.string().custom((value, helpers) => {
  const [, year, month, day] = ISO_DATE_TIME.exec(value) ?? [];
  const calendar = year ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))) : null;
  if (calendar?.getUTCDate() !== Number(day) || Number.isNaN(Date.parse(value)))
    return helpers.error('any.invalid');
  return new Date(value).toISOString();
});
const optionalDate = isoDateTime.allow(null).empty('').default(null);
/** A known INSEE commune code (decision V); also validates the agenda city filter. */
export const commune = Joi.string().custom((code, helpers) => (findCommune(code) ? code : helpers.error('any.invalid')));

/** Editable fields: the allow-list of `changes` and creation bodies (status, version, ids excluded). */
const FIELD_SCHEMAS = {
  title: Joi.string().trim().min(1).max(120).pattern(SINGLE_LINE).required(),
  type: Joi.string().valid(...EVENT_TYPES).required(),
  shortDescription: optionalText(280),
  longDescription: optionalText(10000, MULTI_LINE),
  startsAt: optionalDate,
  endsAt: optionalDate,
  venueLabel: optionalText(200),
  venueAddress: optionalText(200),
  venueCity: commune.allow(null).empty('').default(null),
  priceKind: Joi.string().valid(...PRICE_KINDS).required(),
  priceAmountCents: Joi.number().integer().min(1).max(100_000_000).allow(null).default(null),
  posterStyle: Joi.string().valid(...POSTER_STYLES).required(),
};
/** BC16 allow-list: the only fields a create or edit may carry. */
export const EDITABLE_FIELDS = Object.keys(FIELD_SCHEMAS);

/**
 * Canonical value of one field: trimmed text, UTC ISO timestamps, null for empty.
 * @throws 400 UNKNOWN_FIELD outside the allow-list, 400 INVALID_FIELD for an invalid value.
 */
export const parseField = (field, value) => {
  if (!Object.hasOwn(FIELD_SCHEMAS, field)) throw eventError(400, 'UNKNOWN_FIELD', 'Unknown field', { field });
  const { error, value: parsed } = FIELD_SCHEMAS[field].validate(value);
  if (error) throw eventError(400, 'INVALID_FIELD', 'Invalid field value', { field });
  return parsed;
};

/** Parse every field of a partial body. @throws as parseField. */
export const parseFields = (values) =>
  Object.fromEntries(Object.entries(values).map(([field, value]) => [field, parseField(field, value)]));

/** Cross-field rules every saved event satisfies, draft or not (mirrors the table CHECKs). */
export const checkConsistency = (event) => {
  if (event.endsAt && (!event.startsAt || event.endsAt < event.startsAt))
    throw eventError(400, 'INVALID_FIELD', 'The end must not precede the start', { field: 'endsAt' });
  if ((event.priceKind === 'AMOUNT') !== (event.priceAmountCents !== null))
    throw eventError(400, 'INVALID_FIELD', 'An amount is required for a priced event, and only then',
      { field: 'priceAmountCents' });
};

/** Defaults of a new draft, overridden by the validated creation body (UC15). */
export const newDraft = (body) => {
  if (!Object.hasOwn(body, 'title') || !Object.hasOwn(body, 'type'))
    throw eventError(400, 'INVALID_FIELD', 'Title and type are required',
      { field: Object.hasOwn(body, 'title') ? 'type' : 'title' });
  const defaults = Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, null]));
  const draft = { ...defaults, priceKind: 'FREE', posterStyle: POSTER_STYLES[0], ...parseFields(body) };
  checkConsistency(draft);
  return draft;
};

/** G1: required fields still null, in REQUIRED_FIELDS order. */
export const missingFields = (event) => REQUIRED_FIELDS.filter((field) => event[field] === null);

/** A1: effective end in ms; `starts_at` + 24 h without an end; null for a draft without start. */
export const effectiveEnd = (event) => {
  if (event.endsAt) return Date.parse(event.endsAt);
  return event.startsAt ? Date.parse(event.startsAt) + DAY_MS : null;
};

/** True once the effective end (A1) is past; a draft without start never ends. */
export const hasEnded = (event, now) => {
  const end = effectiveEnd(event);
  return end !== null && end < now;
};

const assertWritable = (event) => {
  if (READ_ONLY.has(event.status))
    throw eventError(409, 'EVENT_READ_ONLY', 'A cancelled or archived event can no longer change.');
};

/**
 * Merge M (02a, Q1): with the current version the changes apply; otherwise a field applies only
 * when its current value still equals the `base` the editor started from. Any conflict refuses
 * the whole save. Returns the merged event, the names of the fields whose value changed (for the
 * activity entry, J4 D4) and whether the schedule changed.
 * @throws 400 BASE_REQUIRED, 409 EDIT_CONFLICT, 409 EVENT_READ_ONLY, 422 PUBLISHED_FIELD_REQUIRED and
 * the parseField/checkConsistency 400s.
 */
export const mergeEdit = (event, { baseVersion, changes, base = {} }) => {
  assertWritable(event);
  const parsed = parseFields(changes);
  const applied = {};
  const conflicts = [];
  for (const [field, value] of Object.entries(parsed)) {
    if (baseVersion === event.version) applied[field] = value;
    else if (!Object.hasOwn(base, field))
      throw eventError(400, 'BASE_REQUIRED', 'The original value of each changed field is required', { field });
    else if (parseField(field, base[field]) === event[field]) applied[field] = value;
    else conflicts.push({ field, yours: value, theirs: event[field] });
  }
  if (conflicts.length) throw eventError(409, 'EDIT_CONFLICT', 'Someone else changed these fields.',
    { conflicts, lastEditedBy: event.lastEditedBy, version: event.version });
  const merged = { ...event, ...applied };
  checkConsistency(merged);
  if (event.status === 'PUBLISHED') {
    const missing = missingFields(merged);
    if (missing.length) throw eventError(422, 'PUBLISHED_FIELD_REQUIRED',
      'A published event must keep its required fields.', { fields: missing });
  }
  const changed = Object.keys(applied).filter((field) => applied[field] !== event[field]);
  return { merged, fields: changed,
    scheduleChanged: event.status === 'PUBLISHED' && changed.some((field) => SCHEDULE_FIELDS.has(field)) };
};

const TRANSITIONS = {
  publish: { from: 'DRAFT', verb: 'published' },
  cancel: { from: 'PUBLISHED', verb: 'cancelled' },
  delete: { from: 'DRAFT', verb: 'deleted' },
};

/**
 * Lifecycle preconditions of publish, cancel and delete (§ 5): read-only, status, version, end.
 * @throws 409 EVENT_READ_ONLY, INVALID_TRANSITION, STALE_VERSION or EVENT_ENDED, in that order.
 */
export const assertTransition = (event, action, baseVersion, now) => {
  assertWritable(event);
  const { from, verb } = TRANSITIONS[action];
  if (event.status !== from)
    throw eventError(409, 'INVALID_TRANSITION', `This event cannot be ${verb} now.`, { status: event.status });
  if (baseVersion !== event.version) throw eventError(409, 'STALE_VERSION', 'The event changed. Reload it first.',
    { version: event.version });
  if (action === 'cancel' && hasEnded(event, now)) throw eventError(409, 'EVENT_ENDED', 'This event has already ended.');
};

/** G1–G3 failures as the client-facing codes; G4 (association, membership) is checked under lock. */
export const publicationFailures = (event, { emailVerified, now }) => [
  ...missingFields(event).map((field) => `MISSING_FIELD:${field}`),
  ...(emailVerified ? [] : ['EMAIL_NOT_VERIFIED']),
  ...(event.startsAt && Date.parse(event.startsAt) <= now ? ['START_IN_PAST'] : []),
];

/** Q: seconds until the oldest creation (epoch ms) of a full 24 h window leaves it; 0 while below the quota. */
export const quotaRetryAfter = ({ count, oldest }, now) =>
  count < CREATION_QUOTA ? 0 : Math.max(1, Math.ceil((oldest + DAY_MS - now) / 1000));
