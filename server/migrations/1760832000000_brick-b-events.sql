-- Brick B: event lifecycle (spec v1-brick-b-event-lifecycle § 3, amendment A-B1).
-- `poster_image_id` is added by the image brick.

-- Up Migration
CREATE TABLE event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES association (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('THEATRE', 'CONCERT', 'EXHIBITION', 'WORKSHOP', 'DANCE', 'CINEMA', 'TALK', 'OTHER')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  short_description text CHECK (char_length(short_description) <= 280),
  long_description text CHECK (char_length(long_description) <= 10000),
  starts_at timestamptz,
  ends_at timestamptz,
  venue_label text CHECK (char_length(venue_label) <= 200),
  venue_address text CHECK (char_length(venue_address) <= 200),
  venue_normalized_city text CHECK (venue_normalized_city ~ '^[0-9][0-9AB][0-9]{3}$'),
  price_kind text NOT NULL DEFAULT 'FREE' CHECK (price_kind IN ('FREE', 'AMOUNT', 'PAY_WHAT_YOU_WANT')),
  price_amount_cents integer,
  poster_style text NOT NULL DEFAULT 'classic'
    CHECK (poster_style IN ('classic', 'bold', 'paper', 'night', 'pastel', 'minimal')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED')),
  cancellation_reason text CHECK (char_length(cancellation_reason) <= 500),
  published_at timestamptz,
  schedule_changed_at timestamptz,
  hidden_by_moderation boolean NOT NULL DEFAULT false,
  cleanup_notice_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by uuid REFERENCES account (id) ON DELETE SET NULL,
  last_edited_by uuid REFERENCES account (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at >= starts_at)),
  CHECK ((price_kind = 'AMOUNT') = (price_amount_cents IS NOT NULL AND price_amount_cents > 0)),
  CHECK (cancellation_reason IS NULL OR status IN ('CANCELLED', 'ARCHIVED')),
  CHECK ((status = 'DRAFT') = (published_at IS NULL)),
  CHECK (status = 'DRAFT' OR (short_description IS NOT NULL AND starts_at IS NOT NULL
    AND venue_label IS NOT NULL AND venue_normalized_city IS NOT NULL))
);
CREATE INDEX event_association_status_idx ON event (association_id, status);
-- A-B3: `timestamptz + interval` is not IMMUTABLE, so the A1 effective end cannot be an index
-- expression; queries use `ends_at < $t OR (ends_at IS NULL AND starts_at < $t - 24 h)` instead.
CREATE INDEX event_status_ends_at_idx ON event (status, ends_at);
CREATE INDEX event_status_starts_at_idx ON event (status, starts_at);
CREATE INDEX event_association_created_at_idx ON event (association_id, created_at);
CREATE INDEX event_created_by_idx ON event (created_by);
CREATE INDEX event_last_edited_by_idx ON event (last_edited_by);

ALTER TABLE activity_entry ADD COLUMN detail jsonb;

ALTER TABLE outbox_message DROP CONSTRAINT outbox_message_template_check;
ALTER TABLE outbox_message ADD CONSTRAINT outbox_message_template_check CHECK (template IN ('VERIFY',
  'VERIFY_REMINDER', 'ACCOUNT_EXISTS', 'RESET', 'EMAIL_CHANGE_NOTICE', 'INVITATION', 'MEMBER_REMOVED',
  'DRAFT_CLEANUP_NOTICE'));

-- Down Migration
DELETE FROM outbox_message WHERE template = 'DRAFT_CLEANUP_NOTICE';
ALTER TABLE outbox_message DROP CONSTRAINT outbox_message_template_check;
ALTER TABLE outbox_message ADD CONSTRAINT outbox_message_template_check CHECK (template IN ('VERIFY',
  'VERIFY_REMINDER', 'ACCOUNT_EXISTS', 'RESET', 'EMAIL_CHANGE_NOTICE', 'INVITATION', 'MEMBER_REMOVED'));
ALTER TABLE activity_entry DROP COLUMN detail;
DROP TABLE event;
