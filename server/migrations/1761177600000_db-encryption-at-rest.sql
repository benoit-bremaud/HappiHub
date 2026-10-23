-- Encryption of sensitive data at rest (spec db-encryption-at-rest § 8, D3, ADR-0004).
-- V1 was never deployed: the clear personal columns are replaced without backfill, so local
-- databases are reset. `*_enc` hold `hh1.<kid>.<b64url>` envelopes (AES-256-GCM), `*_bidx` the
-- HMAC-SHA256 blind index of the folded address. The lowercase rule moves to `foldEmail`.

-- Up Migration
ALTER TABLE account
  DROP COLUMN email,
  DROP COLUMN pending_email,
  DROP COLUMN display_name,
  ADD COLUMN email_enc text NOT NULL,
  ADD COLUMN email_bidx bytea NOT NULL,
  ADD COLUMN pending_email_enc text,
  ADD COLUMN pending_email_bidx bytea,
  ADD COLUMN display_name_enc text,
  ADD CONSTRAINT account_email_bidx_key UNIQUE (email_bidx);

ALTER TABLE invitation
  DROP COLUMN email,
  ADD COLUMN email_enc text NOT NULL,
  ADD COLUMN email_bidx bytea NOT NULL;
CREATE UNIQUE INDEX invitation_pending_email_uq ON invitation (association_id, email_bidx) WHERE status = 'PENDING';
CREATE INDEX invitation_email_idx ON invitation (email_bidx);

ALTER TABLE association
  DROP COLUMN contact_email,
  ADD COLUMN contact_email_enc text;

ALTER TABLE outbox_message
  DROP COLUMN recipient,
  DROP COLUMN payload,
  ADD COLUMN recipient_enc text NOT NULL,
  ADD COLUMN recipient_bidx bytea NOT NULL,
  ADD COLUMN payload_enc text;
CREATE INDEX outbox_message_recipient_idx ON outbox_message (recipient_bidx);

-- Down Migration
-- Restores the clear column shapes, empty (no data to decrypt back: V1 has none deployed).
TRUNCATE account, invitation, outbox_message CASCADE;

DROP INDEX outbox_message_recipient_idx;
ALTER TABLE outbox_message
  DROP COLUMN recipient_enc,
  DROP COLUMN recipient_bidx,
  DROP COLUMN payload_enc,
  ADD COLUMN recipient text NOT NULL,
  ADD COLUMN payload jsonb;
CREATE INDEX outbox_message_recipient_idx ON outbox_message (recipient);

ALTER TABLE association
  DROP COLUMN contact_email_enc,
  ADD COLUMN contact_email text;

DROP INDEX invitation_email_idx;
DROP INDEX invitation_pending_email_uq;
ALTER TABLE invitation
  DROP COLUMN email_enc,
  DROP COLUMN email_bidx,
  ADD COLUMN email text NOT NULL CHECK (email = lower(email));
CREATE UNIQUE INDEX invitation_pending_email_uq ON invitation (association_id, email) WHERE status = 'PENDING';
CREATE INDEX invitation_email_idx ON invitation (email);

ALTER TABLE account
  DROP COLUMN email_enc,
  DROP COLUMN email_bidx,
  DROP COLUMN pending_email_enc,
  DROP COLUMN pending_email_bidx,
  DROP COLUMN display_name_enc,
  ADD COLUMN email text NOT NULL UNIQUE CHECK (email = lower(email)),
  ADD COLUMN pending_email text CHECK (pending_email = lower(pending_email)),
  ADD COLUMN display_name text;
