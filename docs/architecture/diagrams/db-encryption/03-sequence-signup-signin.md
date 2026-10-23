# Sequence diagram — db-encryption — Sign-up and sign-in with a blind index

> **Source spec**: [encryption at rest](../../specs/db-encryption-at-rest.md) § 4–5, § 8

Status: proposed, awaiting Benoît's validation.

Question answered: how do uniqueness and lookup work when the email column is ciphertext?

```mermaid
sequenceDiagram
  actor V as Visitor
  participant A as accounts service
  participant C as fieldCipher
  participant DB as PostgreSQL
  V->>A: sign up (email, password)
  A->>A: e = foldEmail(email)
  A->>C: blindIndex(e)
  C-->>A: bidx (HMAC-SHA256, 32 bytes)
  A->>C: encrypt("account.email", e)
  C-->>A: hh1.k2026a.…
  A->>DB: INSERT (email_enc, email_bidx, password_hash) ON CONFLICT (email_bidx) DO NOTHING
  alt new row
    DB-->>A: id
    A->>C: encrypt("outbox_message.recipient", e), encrypt("outbox_message.payload", {link})
    A->>DB: INSERT outbox (recipient_enc, recipient_bidx, payload_enc)
  else conflict
    A->>DB: INSERT outbox ACCOUNT_EXISTS (same encryption)
  end
  A-->>V: neutral answer (unchanged)
  V->>A: sign in (email, password)
  A->>C: blindIndex(foldEmail(email))
  A->>DB: SELECT … WHERE email_bidx = $1
  DB-->>A: row (email_enc, display_name_enc, password_hash)
  A->>C: decrypt("account.email", email_enc)
  alt envelope invalid (tampered, wrong column, unknown kid)
    C-->>A: FieldCipherError (no value inside)
    A-->>V: 500 generic error
  else ok
    A-->>V: session opened (unchanged flow)
  end
```
