import { findCommune } from '../../domain/communes.js';
import {
  assertTransition, CREATION_QUOTA, DAY_MS, EDITABLE_FIELDS, effectiveEnd, hasEnded, mergeEdit, newDraft,
  parseField, publicationFailures, quotaError, quotaRetryAfter,
} from '../../domain/event.js';

const NOW = Date.parse('2026-10-19T10:00:00Z');
const FUTURE = '2026-11-01T18:00:00.000Z';

/** A complete draft as the service maps it from a row. */
const draft = (overrides = {}) => ({
  ...newDraft({ title: 'Concert', type: 'CONCERT', shortDescription: 'Live', startsAt: FUTURE,
    venueLabel: 'Salle des fêtes', venueCity: '69123' }),
  status: 'DRAFT', version: 3, lastEditedBy: 'Claire', ...overrides,
});

/** Capture the refusal thrown by `action` as `{status, code, details}`. */
const refusal = (action) => {
  try { action(); } catch (error) {
    // Non-enumerable message keeps toEqual comparisons to status, code and details.
    return Object.defineProperty({ status: error.status, ...error.details }, 'message', { value: error.message });
  }
  throw new Error('expected a refusal');
};

describe('field validation and allow-list (BC16)', () => {
  test('editable fields exclude status, version, ids and timestamps', () => {
    for (const field of ['status', 'version', 'id', 'associationId', 'createdBy', 'publishedAt', '__proto__', 'constructor'])
      expect(refusal(() => parseField(field, 'x'))).toMatchObject({ status: 400, code: 'UNKNOWN_FIELD', details: { field } });
    expect(EDITABLE_FIELDS).toHaveLength(12);
  });

  test('text is trimmed, empty optional text becomes null, timestamps become ISO', () => {
    expect(parseField('title', '  Concert ')).toBe('Concert');
    expect(parseField('shortDescription', '')).toBeNull();
    expect(parseField('startsAt', '2026-11-01T19:00:00+01:00')).toBe(FUTURE);
    expect(parseField('longDescription', 'Line one\nLine two\tend')).toBe('Line one\nLine two\tend');
  });

  test.each([
    ['title', ''], ['title', 'x'.repeat(121)], ['title', 'bell\u0007'], ['title', 'two\nlines'], ['title', null],
    ['shortDescription', 'x'.repeat(281)], ['longDescription', 'x'.repeat(10001)], ['longDescription', 'nul\u0000'],
    ['venueLabel', 'x'.repeat(201)], ['type', 'PARTY'], ['posterStyle', 'neon'], ['priceKind', 'DONATION'],
    ['priceAmountCents', 0], ['priceAmountCents', 1.5], ['startsAt', 'tomorrow'], ['venueCity', 'Lyon'],
    ['venueCity', '99999'], ['startsAt', 1234], ['startsAt', '2026-02-30T10:00:00Z'], ['startsAt', '2026-11-01T18:00'],
    ['title', 'bidi\u202Eoverride'], ['title', 'zero\u200Bwidth'], ['title', 'line\u2028sep'],
    ['longDescription', 'para\u2029sep'],
  ])('%s = %j answers 400 INVALID_FIELD', (field, value) => {
    expect(refusal(() => parseField(field, value))).toMatchObject({ status: 400, code: 'INVALID_FIELD', details: { field } });
  });

  test('cities come from the INSEE reference list (V)', () => {
    expect(findCommune('69123')).toEqual({ code: '69123', name: 'Lyon', department: '69' });
    expect(findCommune('2A004').name).toBe('Ajaccio');
    expect(findCommune('75101')).toBeNull(); // arrondissements are not filter values
    expect(parseField('venueCity', '69123')).toBe('69123');
  });
});

describe('new draft (UC15)', () => {
  test('title and type suffice; defaults FREE and the first poster style', () => {
    expect(newDraft({ title: 'Atelier', type: 'WORKSHOP' })).toMatchObject({ title: 'Atelier', type: 'WORKSHOP',
      priceKind: 'FREE', posterStyle: 'classic', startsAt: null, venueCity: null });
  });

  test('missing title or type, inconsistent end or price answer 400', () => {
    expect(refusal(() => newDraft({ type: 'TALK' })).details).toEqual({ field: 'title' });
    expect(refusal(() => newDraft({ title: 'T' })).details).toEqual({ field: 'type' });
    expect(refusal(() => newDraft({ title: 'T', type: 'TALK', startsAt: FUTURE, endsAt: '2026-10-31T00:00:00Z' })).details)
      .toEqual({ field: 'endsAt' });
    expect(refusal(() => newDraft({ title: 'T', type: 'TALK', endsAt: FUTURE })).details).toEqual({ field: 'endsAt' });
    expect(refusal(() => newDraft({ title: 'T', type: 'TALK', priceKind: 'AMOUNT' })).details).toEqual({ field: 'priceAmountCents' });
    expect(refusal(() => newDraft({ title: 'T', type: 'TALK', priceAmountCents: 500 })).details).toEqual({ field: 'priceAmountCents' });
    expect(newDraft({ title: 'T', type: 'TALK', priceKind: 'AMOUNT', priceAmountCents: 500 }).priceAmountCents).toBe(500);
  });
});

describe('merge M (UC16, UC17)', () => {
  test('current version: changes apply (BC3)', () => {
    const result = mergeEdit(draft(), { baseVersion: 3, changes: { title: 'Grand concert' } });
    expect(result).toMatchObject({ merged: { title: 'Grand concert' }, fields: ['title'], scheduleChanged: false });
  });

  test('only fields whose value changes are reported for the activity log', () => {
    expect(mergeEdit(draft(), { baseVersion: 3, changes: { title: 'Concert', venueLabel: 'Théâtre' } }).fields)
      .toEqual(['venueLabel']);
  });

  test('older version, different field untouched since: applies (BC4)', () => {
    const result = mergeEdit(draft({ title: 'Renamed by Malik' }), { baseVersion: 2,
      changes: { venueLabel: 'Théâtre' }, base: { venueLabel: 'Salle des fêtes' } });
    expect(result.merged).toMatchObject({ title: 'Renamed by Malik', venueLabel: 'Théâtre' });
  });

  test('older version, same field changed meanwhile: conflict with yours/theirs/editor (BC5)', () => {
    expect(refusal(() => mergeEdit(draft({ title: 'Malik title' }), { baseVersion: 2,
      changes: { title: 'Claire title', venueLabel: 'Théâtre' }, base: { title: 'Concert', venueLabel: 'Salle des fêtes' } })))
      .toEqual({ status: 409, code: 'EDIT_CONFLICT', details: { lastEditedBy: 'Claire', version: 3,
        conflicts: [{ field: 'title', yours: 'Claire title', theirs: 'Malik title' }] } });
  });

  test('older version without a base value answers BASE_REQUIRED', () => {
    expect(refusal(() => mergeEdit(draft(), { baseVersion: 1, changes: { title: 'X' } })))
      .toMatchObject({ status: 400, code: 'BASE_REQUIRED', details: { field: 'title' } });
  });

  test('base values are compared in canonical form', () => {
    const result = mergeEdit(draft(), { baseVersion: 1, changes: { venueLabel: 'Théâtre' },
      base: { venueLabel: '  Salle des fêtes ' } });
    expect(result.merged.venueLabel).toBe('Théâtre');
  });

  test('cancelled and archived events are read-only (E1)', () => {
    for (const status of ['CANCELLED', 'ARCHIVED'])
      expect(refusal(() => mergeEdit(draft({ status }), { baseVersion: 3, changes: { title: 'X' } })))
        .toMatchObject({ status: 409, code: 'EVENT_READ_ONLY' });
  });

  test('a published event keeps its required fields (BC6) but a draft may clear them', () => {
    expect(refusal(() => mergeEdit(draft({ status: 'PUBLISHED' }), { baseVersion: 3, changes: { shortDescription: '' } })))
      .toEqual({ status: 422, code: 'PUBLISHED_FIELD_REQUIRED', details: { fields: ['shortDescription'] } });
    expect(mergeEdit(draft(), { baseVersion: 3, changes: { shortDescription: '' } }).merged.shortDescription).toBeNull();
  });

  test('schedule change only for start, end or venue of a published event, and only when the value differs (BC7)', () => {
    const published = draft({ status: 'PUBLISHED' });
    expect(mergeEdit(published, { baseVersion: 3, changes: { venueCity: '75056' } }).scheduleChanged).toBe(true);
    expect(mergeEdit(published, { baseVersion: 3, changes: { endsAt: '2026-11-01T22:00:00Z' } }).scheduleChanged).toBe(true);
    expect(mergeEdit(published, { baseVersion: 3, changes: { venueLabel: 'Salle des fêtes' } }).scheduleChanged).toBe(false);
    expect(mergeEdit(published, { baseVersion: 3, changes: { title: 'X' } }).scheduleChanged).toBe(false);
    expect(mergeEdit(draft(), { baseVersion: 3, changes: { startsAt: '2026-12-01T18:00:00Z' } }).scheduleChanged).toBe(false);
  });

  test('the merged event is validated as a whole', () => {
    expect(refusal(() => mergeEdit(draft(), { baseVersion: 3, changes: { endsAt: '2026-10-30T00:00:00Z' } })).details)
      .toEqual({ field: 'endsAt' });
  });
});

describe('transitions and guard (UC18–UC20)', () => {
  test('read-only first, then status, then version, then end', () => {
    expect(refusal(() => assertTransition(draft({ status: 'CANCELLED' }), 'cancel', 3, NOW)).code).toBe('EVENT_READ_ONLY');
    expect(refusal(() => assertTransition(draft({ status: 'PUBLISHED' }), 'publish', 2, NOW)))
      .toMatchObject({ status: 409, code: 'INVALID_TRANSITION', details: { status: 'PUBLISHED' } });
    expect(refusal(() => assertTransition(draft(), 'cancel', 3, NOW)).code).toBe('INVALID_TRANSITION');
    expect(refusal(() => assertTransition(draft({ status: 'PUBLISHED' }), 'delete', 3, NOW)).message)
      .toBe('This event cannot be deleted now.');
    expect(refusal(() => assertTransition(draft(), 'publish', 2, NOW)))
      .toMatchObject({ code: 'STALE_VERSION', details: { version: 3 } });
    const ended = draft({ status: 'PUBLISHED', startsAt: '2026-10-18T08:00:00.000Z' });
    expect(refusal(() => assertTransition(ended, 'cancel', 3, NOW)).code).toBe('EVENT_ENDED');
    expect(() => assertTransition(draft({ status: 'PUBLISHED' }), 'cancel', 3, NOW)).not.toThrow();
    expect(() => assertTransition(draft(), 'delete', 3, NOW)).not.toThrow();
  });

  test('guard codes for missing fields, unverified email and past start (BC8)', () => {
    const empty = newDraft({ title: 'T', type: 'TALK' });
    expect(publicationFailures(empty, { emailVerified: false, now: NOW })).toEqual(['MISSING_FIELD:shortDescription',
      'MISSING_FIELD:startsAt', 'MISSING_FIELD:venueLabel', 'MISSING_FIELD:venueCity', 'EMAIL_NOT_VERIFIED']);
    expect(publicationFailures(draft({ startsAt: '2026-10-19T10:00:00.000Z' }), { emailVerified: true, now: NOW }))
      .toEqual(['START_IN_PAST']);
    expect(publicationFailures(draft(), { emailVerified: true, now: NOW })).toEqual([]);
  });
});

describe('effective end A1 and quota Q', () => {
  test('end, or start + 24 h, or none', () => {
    expect(effectiveEnd({ startsAt: FUTURE, endsAt: '2026-11-01T22:00:00.000Z' })).toBe(Date.parse('2026-11-01T22:00:00Z'));
    expect(effectiveEnd({ startsAt: FUTURE, endsAt: null })).toBe(Date.parse(FUTURE) + DAY_MS);
    expect(effectiveEnd({ startsAt: null, endsAt: null })).toBeNull();
    expect(hasEnded({ startsAt: '2026-10-18T10:00:00.000Z', endsAt: null }, NOW)).toBe(false); // exactly 24 h
    expect(hasEnded({ startsAt: '2026-10-18T09:59:59.000Z', endsAt: null }, NOW)).toBe(true);
    expect(hasEnded({ startsAt: null, endsAt: null }, NOW)).toBe(false);
  });

  test('quota refusal is a 429 EVENT_QUOTA carrying retryAfter', () => {
    expect(quotaError(60)).toMatchObject({ status: 429, details: { code: 'EVENT_QUOTA', retryAfter: 60 } });
    expect(quotaError(60).message).toContain(String(CREATION_QUOTA));
  });

  test('retry after is the time until the oldest creation leaves the window', () => {
    expect(quotaRetryAfter({ count: CREATION_QUOTA - 1, oldest: NOW - 1000 }, NOW)).toBe(0);
    expect(quotaRetryAfter({ count: CREATION_QUOTA, oldest: NOW - DAY_MS + 90_500 }, NOW)).toBe(91);
    expect(quotaRetryAfter({ count: CREATION_QUOTA, oldest: NOW - DAY_MS }, NOW)).toBe(1);
  });
});
