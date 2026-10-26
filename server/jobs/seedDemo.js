import { readdirSync } from 'node:fs';
import { FIELD } from '../domain/fieldCipher.js';
import { runMaintenance } from './maintenance.js';
import { findAccount, resendVerification, signUp, updateAccount, verifyEmail } from '../services/accounts.js';
import { closeAssociation, createAdditionalAssociation, findMembership } from '../services/associations.js';
import { cancelEvent, createEvent, editEvent, publishEvent } from '../services/events.js';
import { acceptInvitation, createInvitation, resendInvitation } from '../services/invitations.js';
import { deliverOutbox, MAX_ATTEMPTS } from '../services/outbox.js';
import { generatePassword, readCredentials, writeCredentials } from '../seed/credentials.js';
import { DEMO_ACCOUNTS, DEMO_ADDRESSES, DEMO_ASSOCIATIONS, demoEvents } from '../seed/demoDataset.js';

// Demo seed of the test-environment spec (#251): every write goes through the services with the
// DEV keyring (D1), keyed by natural keys in the reserved namespace (D3), one service transaction
// at a time so a rerun completes a failed run (D7). Direct SQL only for the E19 flag (D6) and the
// P7 role (G1). The run clock `ctx.now` is moved into the past for the states of D6.

// The invitee of A1 whose invitation delivery fails (§ 4.3); the unverified persona keeps a pending VERIFY.
const FAILING_RECIPIENT = DEMO_ACCOUNTS.find((a) => a.key === DEMO_ASSOCIATIONS[0].pendingInvitations[0]).email;
const UNVERIFIED = DEMO_ACCOUNTS.find((a) => a.verified === false).email;

const accountIdByEmail = async (ctx, email) =>
  (await ctx.db.query('SELECT id FROM account WHERE email_bidx = $1', [ctx.cipher.blindIndex(email)])).rows[0]?.id ?? null;

/** Token of the latest queued VERIFY email to `email`, read as the integration harness does (G5). */
const queuedVerifyToken = async (ctx, email) => {
  const { rows: [row] } = await ctx.db.query(
    `SELECT payload_enc FROM outbox_message WHERE recipient_bidx = $1 AND template = 'VERIFY'
     ORDER BY created_at DESC, id LIMIT 1`, [ctx.cipher.blindIndex(email)]);
  return row && JSON.parse(ctx.cipher.decrypt(FIELD.outboxPayload, row.payload_enc)).link.split('#')[1];
};

/** Refuse a database whose schema is behind the migration files (spec § 8 step 1). */
const assertMigrated = async (db, migrationsDir) => {
  const expected = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).length;
  const { rows: [{ count }] } = await db.query('SELECT count(*)::int AS count FROM pgmigrations')
    .catch((error) => {
      if (error.code !== '42P01') throw error; // 42P01: no migration table yet
      return { rows: [{ count: 0 }] };
    });
  if (count < expected) throw new Error('The demo database is not migrated: run npm run migrate first');
};

/** `--reset`: delete only namespace rows; foreign keys cascade to memberships, events and activity. */
const resetNamespace = async (ctx) => {
  const bidx = DEMO_ADDRESSES.map((email) => ctx.cipher.blindIndex(email));
  await ctx.db.query(
    `DELETE FROM association WHERE name = ANY($1::text[])
       AND created_by IN (SELECT id FROM account WHERE email_bidx = ANY($2::bytea[]))`,
    [DEMO_ASSOCIATIONS.map((a) => a.name), bidx]);
  await ctx.db.query('DELETE FROM invitation WHERE email_bidx = ANY($1::bytea[])', [bidx]);
  await ctx.db.query('DELETE FROM outbox_message WHERE recipient_bidx = ANY($1::bytea[])', [bidx]);
  await ctx.db.query('DELETE FROM account WHERE email_bidx = ANY($1::bytea[])', [bidx]);
};

/**
 * Bring an account to its persona state from whatever a previous, interrupted run left (D7):
 * each step runs only when its state is missing. Returns whether anything changed.
 */
const convergeAccount = async (ctx, persona, id) => {
  let account = await findAccount(ctx.db, ctx.cipher, id);
  let changed = false;
  if (persona.verified !== false && !account.emailVerifiedAt) {
    let token = await queuedVerifyToken(ctx, persona.email);
    if (!token) {
      await resendVerification(ctx, persona.email);
      token = await queuedVerifyToken(ctx, persona.email);
    }
    await verifyEmail(ctx, token);
    account = await findAccount(ctx.db, ctx.cipher, id);
    changed = true;
  }
  if (account.displayName !== persona.displayName) {
    account = await updateAccount(ctx, account, { displayName: persona.displayName });
    changed = true;
  }
  if (persona.pendingEmail && account.pendingEmail !== persona.pendingEmail) {
    account = await updateAccount(ctx, account, { email: persona.pendingEmail });
    changed = true;
  }
  if (persona.platformRole && account.platformRole !== persona.platformRole) {
    await ctx.db.query('UPDATE account SET platform_role = $2 WHERE id = $1', [id, persona.platformRole]); // G1
    changed = true;
  }
  return changed;
};

/** Create or complete one persona; the password is kept unless missing or rotated (D2). */
const seedAccount = async (ctx, persona, passwords, { rotatePasswords }, tally) => {
  let id = await accountIdByEmail(ctx, persona.email);
  const known = passwords.get(persona.email);
  const password = !known || rotatePasswords ? generatePassword() : known;
  const created = !id;
  if (created) {
    await signUp(ctx, { email: persona.email, password });
    id = await accountIdByEmail(ctx, persona.email);
  } else if (password !== known) {
    // Lost credentials file or --rotate-passwords: the service sets the new hash (and ends sessions).
    await updateAccount(ctx, await findAccount(ctx.db, ctx.cipher, id), { newPassword: password });
  }
  const converged = await convergeAccount(ctx, persona, id);
  if (created) tally.created += 1;
  else tally[password !== known || converged ? 'updated' : 'unchanged'] += 1;
  passwords.set(persona.email, password);
  return id;
};

const findAssociation = async (ctx, name) =>
  (await ctx.db.query('SELECT id, name, slug, status FROM association WHERE name = $1', [name])).rows[0] ?? null;

const seedAssociation = async (ctx, definition, ids, personas, tally) => {
  let row = await findAssociation(ctx, definition.name);
  if (!row) {
    await createAdditionalAssociation(ctx, ids[definition.owner], definition.name);
    row = await findAssociation(ctx, definition.name);
    tally.created += 1;
  } else {
    tally.unchanged += 1;
  }
  const owner = await findAccount(ctx.db, ctx.cipher, ids[definition.owner]);
  for (const key of definition.members ?? []) {
    const { rows: member } = await ctx.db.query(
      'SELECT 1 FROM membership WHERE association_id = $1 AND account_id = $2', [row.id, ids[key]]);
    if (member.length) continue;
    const association = await findMembership(ctx.db, owner.id, row.slug);
    // A run interrupted between invitation and acceptance left a pending row: resend gives a new token.
    const { rows: [open] } = await ctx.db.query(
      "SELECT id FROM invitation WHERE association_id = $1 AND email_bidx = $2 AND status = 'PENDING' AND expires_at > $3",
      [row.id, ctx.cipher.blindIndex(personas[key].email), new Date(ctx.now())]);
    const { link } = open ? await resendInvitation(ctx, owner, association, open.id)
      : await createInvitation(ctx, owner, association, personas[key].email);
    await acceptInvitation(ctx, await findAccount(ctx.db, ctx.cipher, ids[key]), { token: link.split('#')[1] });
    tally.created += 1;
  }
  for (const key of definition.pendingInvitations ?? []) {
    const { rows: pending } = await ctx.db.query(
      'SELECT 1 FROM invitation WHERE association_id = $1 AND email_bidx = $2 AND expires_at > $3',
      [row.id, ctx.cipher.blindIndex(personas[key].email), new Date(ctx.now())]);
    if (pending.length) continue;
    await createInvitation(ctx, owner, await findMembership(ctx.db, owner.id, row.slug), personas[key].email);
    tally.created += 1;
  }
  if (definition.closed && row.status === 'ACTIVE') {
    await closeAssociation(ctx, owner.id, await findMembership(ctx.db, owner.id, row.slug));
  }
  return row;
};

/**
 * Create or complete one event through the services, at the seed clock of its definition (D6).
 * Each step runs only when the current state lacks it, so a rerun finishes a half-built event (D7).
 * Returns 'created', 'updated' or 'unchanged'.
 */
const seedEvent = async (ctx, clock, definition, associations, ids) => {
  const association = associations[definition.association];
  const { rows: [existing] } = await ctx.db.query(
    `SELECT id, version, status, schedule_changed_at, hidden_by_moderation FROM event
     WHERE association_id = $1 AND title = $2`, [association.id, definition.body.title]);
  const runNow = clock.now;
  clock.now = runNow - (definition.createdAgo ?? 0);
  let outcome = existing ? 'unchanged' : 'created';
  const step = () => { if (outcome === 'unchanged') outcome = 'updated'; };
  try {
    const member = await findMembership(ctx.db, ids[definition.by], association.slug);
    let view = existing ?? await createEvent(ctx, ids[definition.by], member, definition.body);
    if (definition.publish && view.status === 'DRAFT') {
      view = await publishEvent(ctx, ids[definition.by], member, view.id, view.version);
      step();
    }
    if (definition.cancelReason && view.status === 'PUBLISHED') {
      view = await cancelEvent(ctx, ids[definition.by], member, view.id,
        { baseVersion: view.version, reason: definition.cancelReason });
      step();
    }
    if (definition.edit && !existing?.schedule_changed_at) {
      const editor = await findMembership(ctx.db, ids[definition.edit.by], association.slug);
      view = await editEvent(ctx, ids[definition.edit.by], editor, view.id,
        { baseVersion: view.version, changes: definition.edit.changes });
      step();
    }
    if (definition.hide && !existing?.hidden_by_moderation) {
      await ctx.db.query('UPDATE event SET hidden_by_moderation = true WHERE id = $1', [view.id]); // D6
      step();
    }
  } finally {
    clock.now = runNow;
  }
  return outcome;
};

/**
 * Failed and pending outbox rows (§ 4.3, G4): delivery passes with a transport that fails for one
 * demo invitation (P4), then a pending VERIFY for P5. Skipped when non-demo rows are pending (§ 8.3).
 */
const seedOutbox = async (ctx, log) => {
  const demo = new Set(DEMO_ADDRESSES.map((email) => ctx.cipher.blindIndex(email).toString('hex')));
  const { rows: failed } = await ctx.db.query('SELECT 1 FROM outbox_message WHERE recipient_bidx = $1 AND failed_at IS NOT NULL',
    [ctx.cipher.blindIndex(FAILING_RECIPIENT)]);
  if (failed.length) return;
  const { rows: pending } = await ctx.db.query('SELECT recipient_bidx FROM outbox_message WHERE failed_at IS NULL');
  if (pending.some((row) => !demo.has(row.recipient_bidx.toString('hex')))) {
    log('outbox fixture skipped: non-demo emails are pending');
    return;
  }
  const transport = { send: async ({ recipient, template }) => {
    if (recipient === FAILING_RECIPIENT && template === 'INVITATION') throw new Error('demo delivery failure');
  } };
  for (let pass = 0; pass < MAX_ATTEMPTS; pass += 1)
    await deliverOutbox(ctx.db, transport, { cipher: ctx.cipher, now: ctx.now, batch: 1000 });
  await resendVerification(ctx, UNVERIFIED);
};

/** § 7 check: one seeded account stores its email as an `hh1.` envelope, never in clear. */
const assertEncrypted = async (ctx, id) => {
  const { rows: [row] } = await ctx.db.query('SELECT email_enc FROM account WHERE id = $1', [id]);
  if (!row.email_enc.startsWith('hh1.')) throw new Error('A seeded email is not encrypted');
};

/**
 * Run the demo seed. `services` holds the db pool, cipher, links and limits of an API context;
 * `clock.now` is the run time (ms); `migrationsDir` the folder the schema level is checked against. Returns `{ created, updated, unchanged }` row counts.
 */
export const seedDemo = async (services, { clock, credentialsFile, migrationsDir, reset = false, rotatePasswords = false, log = () => {} }) => {
  const ctx = { ...services, now: () => clock.now };
  await assertMigrated(ctx.db, migrationsDir);
  if (reset) await resetNamespace(ctx);
  const tally = { created: 0, updated: 0, unchanged: 0 };
  const passwords = readCredentials(credentialsFile);
  const personas = Object.fromEntries(DEMO_ACCOUNTS.map((persona) => [persona.key, persona]));
  const ids = {};
  // Seeding is sequential on purpose: each step reads the state the previous one wrote (D7).
  for (const persona of DEMO_ACCOUNTS) {
    ids[persona.key] = await seedAccount(ctx, persona, passwords, { rotatePasswords }, tally);
    // Written after each account so an interrupted run never loses a password already set.
    writeCredentials(credentialsFile, DEMO_ACCOUNTS.filter(({ email }) => passwords.has(email))
      .map(({ key, email }) => ({ key, email, password: passwords.get(email) })));
  }

  const associations = {};
  for (const definition of DEMO_ASSOCIATIONS)
    associations[definition.key] = await seedAssociation(ctx, definition, ids, personas, tally);

  // E16 and E18 reach their state through the job (D6), run before the other events so it does
  // not archive E12 at once; the API's hourly tick archives E12 later (G3).
  const events = demoEvents(clock.now);
  let needsMaintenance = false;
  for (const definition of events.filter((event) => event.maintenance)) {
    const outcome = await seedEvent(ctx, clock, definition, associations, ids);
    tally[outcome] += 1;
    needsMaintenance ||= outcome === 'created';
  }
  if (needsMaintenance) await runMaintenance(ctx);
  for (const definition of events.filter((event) => !event.maintenance))
    tally[await seedEvent(ctx, clock, definition, associations, ids)] += 1;
  await seedOutbox(ctx, log);
  await assertEncrypted(ctx, ids.P1);
  return tally;
};
