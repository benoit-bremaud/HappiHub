import { runMaintenance } from '../../jobs/maintenance.js';
import { createLogTransport, deliverOutbox } from '../../services/outbox.js';
import { browser, buildApp, createPool, lastEmail, migrate, PASSWORD, resetData, signUpVerified } from './harness.js';

const DAY = 24 * 3600e3;
let pool, app, clock;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app, clock } = buildApp(pool)); });
afterAll(() => pool.end());

const run = () => runMaintenance(app.locals.ctx);
const n = async (sql) => (await pool.query(sql)).rows.length;

describe('maintenance job (AC19)', () => {
  test('expires invitations and purges expired tokens', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.post('/api/associations/troupe/invitations', { email: 'm@example.org' });
    await (await browser(app)).post('/api/password-reset', { email: 'claire@example.org' });
    clock.now += 7 * DAY + 1;
    const counts = await run();
    expect(counts).toMatchObject({ invitationsExpired: 1, tokensPurged: 1 });
    expect(await n('SELECT 1 FROM invitation')).toBe(0);
    expect(await n('SELECT 1 FROM auth_token')).toBe(0);
  });

  test('reminds at day 23 once, deletes at day 30 with UC6 effects', async () => {
    const client = await browser(app);
    await client.post('/api/signup', { email: 'late@example.org', password: PASSWORD, associationName: 'Late' });
    clock.now += 22 * DAY;
    expect((await run()).remindersQueued).toBe(0);
    clock.now += DAY + 1;
    expect((await run()).remindersQueued).toBe(1);
    expect((await run()).remindersQueued).toBe(0);
    expect((await lastEmail(pool, 'late@example.org', 'VERIFY_REMINDER')).payload.link).toContain('/verify-email#');
    clock.now += 7 * DAY;
    expect((await run()).unverifiedAccountsDeleted).toBe(1);
    expect(await n('SELECT 1 FROM account')).toBe(0);
    expect(await n("SELECT 1 FROM association WHERE status = 'CLOSED'")).toBe(1);
    expect(await n("SELECT 1 FROM outbox_message WHERE recipient = 'late@example.org'")).toBe(0);
  });

  test('purges outbox failures after 30 days, activity after 12 months, closed associations after 30 days', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await pool.query("INSERT INTO outbox_message (recipient, template, failed_at) VALUES ('x@example.org', 'RESET', $1)", [new Date(clock.now)]);
    await claire.post('/api/associations', { name: 'Closing' });
    await claire.post('/api/associations/closing/close', { confirm: true });
    clock.now += 31 * DAY;
    expect(await run()).toMatchObject({ outboxFailuresPurged: 1, closedAssociationsPurged: 1, activityPurged: 0 });
    clock.now += 365 * DAY;
    expect((await run()).activityPurged).toBeGreaterThan(0);
  });
});

describe('event tasks (brick B BC13, C1)', () => {
  const EVENTS = '/api/associations/troupe/events';
  const status = async (id) => (await pool.query('SELECT status FROM event WHERE id = $1', [id])).rows[0]?.status;
  const publishable = () => ({ title: 'Concert', type: 'CONCERT', shortDescription: 'Live', venueLabel: 'Salle',
    venueCity: '69123', startsAt: new Date(clock.now + DAY).toISOString() });

  test('archives published and cancelled events after their effective end (A1), never drafts', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push((await claire.post(EVENTS, publishable())).body.id);
    const [noEnd, withEnd, cancelled] = ids;
    for (const id of ids) await claire.post(`${EVENTS}/${id}/publish`, { baseVersion: 1 });
    await claire.post(`${EVENTS}/${cancelled}/cancel`, { baseVersion: 2, confirm: true });
    await pool.query('UPDATE event SET ends_at = starts_at + interval \'3 hours\' WHERE id = ANY($1)', [[withEnd, cancelled]]);
    const draft = (await claire.post(EVENTS, publishable())).body.id;
    clock.now += 2 * DAY - 1000; // noEnd still within start + 24 h
    expect((await run()).eventsArchived).toBe(2);
    expect([await status(noEnd), await status(withEnd), await status(cancelled), await status(draft)])
      .toEqual(['PUBLISHED', 'ARCHIVED', 'ARCHIVED', 'DRAFT']);
    clock.now += 2000;
    expect((await run()).eventsArchived).toBe(1);
    expect((await run()).eventsArchived).toBe(0);
  });

  test('notifies members of a draft untouched for 12 months once, deletes it 14 days later unless edited', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const kept = (await claire.post(EVENTS, { title: 'Kept', type: 'TALK' })).body.id;
    const dropped = (await claire.post(EVENTS, { title: 'Dropped', type: 'TALK' })).body.id;
    await pool.query("UPDATE event SET updated_at = $1::timestamptz - interval '13 months'", [new Date(clock.now)]);
    expect((await run()).draftNoticesSent).toBe(2);
    expect((await run()).draftNoticesSent).toBe(0);
    expect((await lastEmail(pool, 'claire@example.org', 'DRAFT_CLEANUP_NOTICE')).payload)
      .toMatchObject({ associationName: 'Troupe' });
    expect(await claire.patch(`${EVENTS}/${kept}`, { baseVersion: 1, changes: { title: 'Still wanted' } }))
      .toMatchObject({ status: 200 });
    clock.now += 14 * DAY + 1000;
    expect((await run()).draftsDeleted).toBe(1);
    expect([await status(kept), await status(dropped)]).toEqual(['DRAFT', undefined]);
  });

  test('drafts of a closed association leave only with the 30-day association purge (C1)', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const draft = (await claire.post(EVENTS, { title: 'Draft', type: 'TALK' })).body.id;
    await claire.post('/api/associations/troupe/close', { confirm: true });
    clock.now += 29 * DAY;
    await run();
    expect(await status(draft)).toBe('DRAFT');
    clock.now += 2 * DAY;
    await run();
    expect(await status(draft)).toBeUndefined();
  });
});

describe('outbox delivery (DF1)', () => {
  test('the log transport writes the link and deletes the row', async () => {
    await (await browser(app)).post('/api/signup', { email: 'o@example.org', password: PASSWORD, associationName: 'Out' });
    const lines = [];
    expect(await deliverOutbox(pool, createLogTransport({ production: false, write: (line) => lines.push(line) }))).toBe(1);
    expect(lines[0]).toMatch(/^\[outbox\] VERIFY to o@example.org: .*verify-email#/);
    expect(await n('SELECT 1 FROM outbox_message')).toBe(0);
  });

  test('failures are retried, then the payload is dropped after 5 attempts', async () => {
    await (await browser(app)).post('/api/signup', { email: 'f@example.org', password: PASSWORD, associationName: 'Fail' });
    const failing = { send: async () => { throw new Error('provider down'); } };
    for (let i = 0; i < 5; i += 1) await deliverOutbox(pool, failing, { now: () => clock.now });
    const { rows: [row] } = await pool.query('SELECT attempts, failed_at, payload FROM outbox_message');
    expect(row).toMatchObject({ attempts: 5, payload: null });
    expect(row.failed_at).not.toBeNull();
    expect(await deliverOutbox(pool, failing)).toBe(0);
  });

  test('the log transport is refused in production', () => {
    expect(() => createLogTransport({ production: true })).toThrow(/refused in production/);
  });
});

describe('no token or password in logs (AC15, AC18)', () => {
  test('a full flow with real tokens writes no secret to the console or the process streams', async () => {
    const output = [];
    const capture = (...args) => { output.push(args.map(String).join(' ')); return true; };
    const spies = [
      ...['log', 'info', 'warn', 'error', 'debug'].map((level) => jest.spyOn(console, level).mockImplementation(capture)),
      jest.spyOn(process.stdout, 'write').mockImplementation(capture),
      jest.spyOn(process.stderr, 'write').mockImplementation(capture),
    ];
    try {
      const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
      const malik = await signUpVerified(app, pool, 'malik@example.org', 'Malik');
      await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' });
      const { token: invitationToken } = await lastEmail(pool, 'malik@example.org', 'INVITATION');
      expect((await malik.post('/api/invitations/accept', { token: invitationToken })).status).toBe(200);
      const anonymous = await browser(app);
      await anonymous.post('/api/password-reset', { email: 'claire@example.org' });
      const { token: resetToken } = await lastEmail(pool, 'claire@example.org', 'RESET');
      const newPassword = 'a secret sentence for the reset';
      expect((await anonymous.post('/api/password-reset/confirm', { token: resetToken, password: newPassword })).status).toBe(200);
      const secrets = [invitationToken, resetToken, PASSWORD, newPassword];
      secrets.forEach((secret) => expect(output.join('\n')).not.toContain(secret));
    } finally { spies.forEach((spy) => spy.mockRestore()); }
  });
});
