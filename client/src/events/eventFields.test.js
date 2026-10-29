import {
  centsToEuros, dayHeading, describeFailure, emptyValues, formatRange, entryStep, eurosToCents, fieldProblem, fromLocalInput,
  fromServer, isPast, missingRequired, priceLabel, stepOf, toLocalInput, typeLabel,
} from './eventFields';

// Pure editor rules (client spec § 5): mirrors of the API field rules, G1 checklist, decision R.

const complete = { ...emptyValues(), title: 'Concert', type: 'CONCERT', shortDescription: 'Live',
  startsAt: '2030-01-01T18:00:00.000Z', venueLabel: 'Hall', venueCity: '69123' };

describe('field problems (UC15 3a, 5a)', () => {
  test('title and type are required, lengths follow the API', () => {
    expect(fieldProblem('title', emptyValues())).toBe('Title is required.');
    expect(fieldProblem('type', emptyValues())).toBe('Type is required.');
    expect(fieldProblem('shortDescription', { shortDescription: 'x'.repeat(281) })).toBe('At most 280 characters.');
    expect(fieldProblem('shortDescription', { shortDescription: 'x'.repeat(280) })).toBeNull();
  });

  test('end before start and a missing amount are refused', () => {
    expect(fieldProblem('endsAt', { startsAt: '2030-01-02T00:00:00Z', endsAt: '2030-01-01T00:00:00Z' })).toBe('The end must be after the start.');
    expect(fieldProblem('endsAt', { startsAt: '2030-01-01T00:00:00Z', endsAt: '2030-01-01T00:00:00Z' })).toBeNull();
    expect(fieldProblem('priceAmountCents', { priceKind: 'AMOUNT', priceAmountCents: null })).toBe('Enter an amount above zero.');
    expect(fieldProblem('priceAmountCents', { priceKind: 'FREE', priceAmountCents: null })).toBeNull();
  });
});

describe('checklist and entry step (G1, decision R)', () => {
  test('lists missing required fields with their step', () => {
    expect(missingRequired(complete)).toEqual([]);
    expect(missingRequired({ ...complete, shortDescription: '', venueCity: null })).toEqual([
      { field: 'shortDescription', label: 'Short description', step: 1 },
      { field: 'venueCity', label: 'City', step: 2 },
    ]);
  });

  test('resumes at the first incomplete step, else the preview', () => {
    expect(entryStep({ ...complete, startsAt: null })).toBe(2);
    expect(entryStep({ ...complete, shortDescription: null })).toBe(1);
    expect(entryStep(complete)).toBe(4);
    expect(stepOf('posterStyle')).toBe(3);
  });

  test('describes server refusals with the step to fix (UC18 3a–3c)', () => {
    expect(describeFailure('MISSING_FIELD:venueCity')).toEqual({ text: 'City is missing.', step: 2 });
    expect(describeFailure('START_IN_PAST')).toEqual({ text: 'The start must be in the future to publish.', step: 2 });
    expect(describeFailure('EMAIL_NOT_VERIFIED')).toEqual({ text: 'Verify your email address before publishing.', resend: true });
    expect(describeFailure('OTHER')).toEqual({ text: 'OTHER' });
  });
});

describe('conversions', () => {
  test('local date input round-trips through an ISO instant with a zone', () => {
    const iso = fromLocalInput('2030-05-04T20:30');
    expect(iso).toMatch(/Z$/);
    expect(toLocalInput(iso)).toBe('2030-05-04T20:30');
    expect(fromLocalInput('')).toBeNull();
    expect(toLocalInput(null)).toBe('');
  });

  test('euros and cents', () => {
    expect(eurosToCents('12,50')).toBe(1250);
    expect(eurosToCents('8')).toBe(800);
    expect(eurosToCents('')).toBeNull();
    expect(eurosToCents('abc')).toBeNull();
    expect(centsToEuros(1250)).toBe('12.50');
    expect(centsToEuros(null)).toBe('');
  });

  test('server views map to form values with the city code', () => {
    expect(fromServer({ title: 'T', venueCity: { code: '69123', name: 'Lyon' }, version: 2 }))
      .toMatchObject({ title: 'T', venueCity: '69123', type: null });
    expect(fromServer({ venueCity: null }).venueCity).toBeNull();
  });

  test('labels and past detection (E2)', () => {
    expect(priceLabel({ priceKind: 'AMOUNT', priceAmountCents: 500 })).toBe('€5.00');
    expect(priceLabel({ priceKind: 'AMOUNT', priceAmountCents: null })).toBe('Price to be set');
    expect(typeLabel('DANCE')).toBe('Dance');
    expect(isPast('2000-01-01T00:00:00Z')).toBe(true);
    expect(isPast('2999-01-01T00:00:00Z')).toBe(false);
  });
});

describe('poster dates (C7, V3)', () => {
  // Local times, so the expectations hold in any test time zone.
  const at = (day, hour) => new Date(2026, 10, day, hour).toISOString();

  test('a same-day range shows the date once, then start and end times', () => {
    expect(formatRange(at(14, 20), at(14, 23))).toBe('Sat, 14 November 2026, 20:00 – 23:00');
  });

  test('a range over several days keeps both full dates; no end shows the start only', () => {
    expect(formatRange(at(14, 20), at(15, 2))).toMatch(/14 November 2026.* – .*15 November 2026/);
    expect(formatRange(at(14, 20), null)).toMatch(/14 November 2026/);
    expect(formatRange(null, null)).toBe('');
  });

  test('day headers name the weekday, day and month', () => {
    expect(dayHeading(at(14, 20))).toBe('Saturday 14 November');
  });
});
