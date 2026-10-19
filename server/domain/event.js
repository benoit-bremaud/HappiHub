import Joi from 'joi';
import { findCommune } from './communes.js';
import { DomainError } from './errors.js';

// Brick B event rules (spec v1-brick-b-event-lifecycle): field validation and allow-list (§ 7),
// merge M (§ 5), publication guard G1/G3 (§ 4), lifecycle transitions, effective end A1 and
// the creation quota window Q. Pure functions: persistence and locking live in services/events.js.

export const DAY_MS = 24 * 3600e3;
export const EVENT_TYPES = ['THEATRE', 'CONCERT', 'EXHIBITION', 'WORKSHOP', 'DANCE', 'CINEMA', 'TALK', 'OTHER'];
export const POSTER_STYLES = ['classic', 'bold', 'paper', 'night', 'pastel', 'minimal'];
export const PRICE_KINDS = ['FREE', 'AMOUNT', 'PAY_WHAT_YOU_WANT'];
export const CREATION_QUOTA = 20;
export const COALESCE_MS = 15 * 60e3;

/** G1: fields a published event must keep (UC18, UC16 2c). */
export const REQUIRED_FIELDS = ['title', 'type', 'shortDescription', 'startsAt', 'venueLabel', 'venueCity'];
const SCHEDULE_FIELDS = new Set(['startsAt', 'endsAt', 'venueLabel', 'venueAddress', 'venueCity']);
const READ_ONLY = new Set(['CANCELLED', 'ARCHIVED']);

/** Refusal with the brick B body `{message, code, details?}`; `retryAfter` sets the header. */
export const eventError = (status, code, message, details, retryAfter) =>
  new DomainError(status, message, { code, ...(details && { details }), ...(retryAfter && { retryAfter }) });

// No control characters in single-line text; long descriptions keep line breaks and tabs.
const SINGLE_LINE = /^\P{Cc}*$/u;
const MULTI_LINE = /^(?:\P{Cc}|[\t\n\r])*$/u;
const optionalText = (max, pattern = SINGLE_LINE) =>
  Joi.string().trim().max(max).pattern(pattern).allow(null).empty('').default(null);
const optionalDate = Joi.date().iso().allow(null).empty('').default(null);
const commune = Joi.string().custom((code, helpers) => (findCommune(code) ? code : helpers.error('any.invalid')));

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
export const EDITABLE_FIELDS = Object.keys(FIELD_SCHEMAS);

/** Canonical value of one field: trimmed text, ISO timestamps, null for empty. */
export const parseField = (field, value) => {
  if (!Object.hasOwn(FIELD_SCHEMAS, field)) throw eventError(400, 'UNKNOWN_FIELD', 'Unknown field', { field });
  const { error, value: parsed } = FIELD_SCHEMAS[field].validate(value);
  if (error) throw eventError(400, 'INVALID_FIELD', 'Invalid field value', { field });
  return parsed instanceof Date ? parsed.toISOString() : parsed;
};

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

export const missingFields = (event) => REQUIRED_FIELDS.filter((field) => event[field] === null);

/** A1: effective end in ms; `starts_at` + 24 h without an end; null for a draft without start. */
export const effectiveEnd = (event) => {
  if (event.endsAt) return Date.parse(event.endsAt);
  return event.startsAt ? Date.parse(event.startsAt) + DAY_MS : null;
};

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
 * the whole save. Returns the merged event, the applied fields and whether the schedule changed.
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
  return { merged, fields: Object.keys(applied),
    scheduleChanged: event.status === 'PUBLISHED' && changed.some((field) => SCHEDULE_FIELDS.has(field)) };
};

const TRANSITIONS = {
  publish: { from: 'DRAFT', verb: 'published' },
  cancel: { from: 'PUBLISHED', verb: 'cancelled' },
  delete: { from: 'DRAFT', verb: 'deleted' },
};

/** Lifecycle preconditions of publish, cancel and delete (§ 5): read-only, status, version, end. */
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

/** Q: seconds until the oldest creation of a full 24 h window leaves it; 0 while below the quota. */
export const quotaRetryAfter = ({ count, oldest }, now) =>
  count < CREATION_QUOTA ? 0 : Math.max(1, Math.ceil((oldest + DAY_MS - now) / 1000));
