// Key rotation job (spec db-encryption-at-rest § 6.2, AC5): re-encrypt every envelope whose key
// id is not the active one, in batches of 200 locked rows, then report what remains per column.
// Idempotent: a second run finds nothing to do. Operator entry point: jobs/runReencrypt.js.
import { withTransaction } from '../db/transaction.js';

// Fixed query texts per table (AC15): only `id > $1` keyset paging and positional values.
const TARGETS = [
  { table: 'account', columns: ['email_enc', 'pending_email_enc', 'display_name_enc'],
    SELECT: 'SELECT id, email_enc, pending_email_enc, display_name_enc FROM account WHERE id > $1 ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED',
    UPDATE: 'UPDATE account SET email_enc = $2, pending_email_enc = $3, display_name_enc = $4 WHERE id = $1',
    SCAN: 'SELECT email_enc, pending_email_enc, display_name_enc FROM account' },
  { table: 'invitation', columns: ['email_enc'],
    SELECT: 'SELECT id, email_enc FROM invitation WHERE id > $1 ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED',
    UPDATE: 'UPDATE invitation SET email_enc = $2 WHERE id = $1',
    SCAN: 'SELECT email_enc FROM invitation' },
  { table: 'association', columns: ['contact_email_enc'],
    SELECT: 'SELECT id, contact_email_enc FROM association WHERE id > $1 ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED',
    UPDATE: 'UPDATE association SET contact_email_enc = $2 WHERE id = $1',
    SCAN: 'SELECT contact_email_enc FROM association' },
  { table: 'outbox_message', columns: ['recipient_enc', 'payload_enc'],
    SELECT: 'SELECT id, recipient_enc, payload_enc FROM outbox_message WHERE id > $1 ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED',
    UPDATE: 'UPDATE outbox_message SET recipient_enc = $2, payload_enc = $3 WHERE id = $1',
    SCAN: 'SELECT recipient_enc, payload_enc FROM outbox_message' },
];
const FIRST_ID = '00000000-0000-0000-0000-000000000000';

const rotate = (cipher, table, column, envelope) => (cipher.needsRotation(envelope)
  ? cipher.encrypt(`${table}.${column}`, cipher.decrypt(`${table}.${column}`, envelope)) : envelope);

const rotateTable = async (db, cipher, { table, columns, SELECT, UPDATE }, batch) => {
  let after = FIRST_ID;
  let rotated = 0;
  for (;;) {
    const rows = await withTransaction(db, async (client) => {
      const { rows: locked } = await client.query(SELECT, [after, batch]);
      for (const row of locked.filter((r) => columns.some((column) => cipher.needsRotation(r[column])))) {
        await client.query(UPDATE, [row.id, ...columns.map((column) => rotate(cipher, table, column, row[column]))]);
        rotated += 1;
      }
      return locked;
    });
    if (rows.length < batch) return rotated;
    after = rows[rows.length - 1].id;
  }
};

/** Envelopes still on another key, per `table.column`; rows locked during the run show up here. */
const remaining = async (db, cipher, { table, columns, SCAN }) => {
  const { rows } = await db.query(SCAN, []);
  return Object.fromEntries(columns.map((column) =>
    [`${table}.${column}`, rows.filter((row) => cipher.needsRotation(row[column])).length]));
};

/** Rotate every table; returns `{ rotatedRows, remaining }`. The old key may go only at zero. */
export const reencrypt = async (db, cipher, { batch = 200 } = {}) => {
  const rotatedRows = {};
  const left = {};
  for (const target of TARGETS) {
    rotatedRows[target.table] = await rotateTable(db, cipher, target, batch);
    Object.assign(left, await remaining(db, cipher, target));
  }
  return { rotatedRows, remaining: left };
};

