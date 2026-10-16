-- Brick D: accounts and associations foundation (spec v1-brick-d-accounts-associations § 4,
-- schema from v1-data-migration § 3). Applied by the operator step `npm run migrate`.

-- Up Migration
CREATE TABLE account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  email_verified_at timestamptz,
  verification_reminder_at timestamptz,
  pending_email text CHECK (pending_email = lower(pending_email)),
  password_hash text NOT NULL,
  display_name text,
  platform_role text NOT NULL DEFAULT 'NONE' CHECK (platform_role IN ('NONE', 'MODERATOR', 'SUPER_ADMIN')),
  auth_version integer NOT NULL DEFAULT 0,
  associations_created integer NOT NULL DEFAULT 0 CHECK (associations_created BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_unverified_created_at_idx ON account (created_at) WHERE email_verified_at IS NULL;

CREATE TABLE association (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  city text,
  presentation text,
  website_url text,
  contact_email text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  closed_at timestamptz,
  created_by uuid REFERENCES account (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'CLOSED') = (closed_at IS NOT NULL))
);

CREATE TABLE membership (
  account_id uuid NOT NULL REFERENCES account (id) ON DELETE CASCADE,
  association_id uuid NOT NULL REFERENCES association (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, association_id)
);
CREATE INDEX membership_association_idx ON membership (association_id);

CREATE TABLE invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES association (id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email)),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  invited_by uuid REFERENCES account (id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX invitation_pending_email_uq ON invitation (association_id, email) WHERE status = 'PENDING';
CREATE INDEX invitation_expires_at_idx ON invitation (expires_at);
CREATE INDEX invitation_email_idx ON invitation (email);

CREATE TABLE auth_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES account (id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('VERIFY', 'RESET')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_token_expires_at_idx ON auth_token (expires_at);
CREATE INDEX auth_token_account_idx ON auth_token (account_id);

CREATE TABLE outbox_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template text NOT NULL CHECK (template IN ('VERIFY', 'VERIFY_REMINDER', 'ACCOUNT_EXISTS', 'RESET',
    'EMAIL_CHANGE_NOTICE', 'INVITATION', 'MEMBER_REMOVED')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  failed_at timestamptz
);
CREATE INDEX outbox_message_failed_at_idx ON outbox_message (failed_at);
CREATE INDEX outbox_message_recipient_idx ON outbox_message (recipient);

CREATE TABLE activity_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES association (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES account (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_ref text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_entry_occurred_at_idx ON activity_entry (occurred_at);
CREATE INDEX activity_entry_association_idx ON activity_entry (association_id, action, occurred_at);

-- connect-pg-simple layout (ADR-0001 store): idle expiry is `expire`.
CREATE TABLE session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamptz NOT NULL
);
CREATE INDEX session_expire_idx ON session (expire);

-- Down Migration
DROP TABLE session;
DROP TABLE activity_entry;
DROP TABLE outbox_message;
DROP TABLE auth_token;
DROP TABLE invitation;
DROP TABLE membership;
DROP TABLE association;
DROP TABLE account;
