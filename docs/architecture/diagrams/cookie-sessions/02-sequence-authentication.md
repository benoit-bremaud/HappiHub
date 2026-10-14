# Sequence diagram — cookie sessions

Source: [validated specification](../../specs/cookie-sessions.md), UC1–UC3 and D5–D9.

> Decision: [ADR-0001](../../decisions/0001-server-managed-cookie-sessions.md).

## Context

This view makes regeneration, persistence-before-success, and server logout explicit.
It is a visual index of the validated HTTP contract.

## Diagram

```mermaid
sequenceDiagram
    title sd — Sign in and revoke a cookie session
    actor Visitor
    participant Browser as React session provider
    participant API as Express API
    participant Store as Mongo session store
    participant Accounts as Mongo accounts
    Browser->>API: GET session
    API->>Store: Save anonymous session and CSRF token
    API-->>Browser: HttpOnly cookie and CSRF token
    Visitor->>Browser: Submit credentials
    Browser->>API: POST login with cookie and CSRF (PII: email, password)
    API->>API: Validate origin and session-bound CSRF
    API->>Accounts: Verify credentials (PII: email)
    Accounts-->>API: Account ID and authVersion (PII: user ID)
    API->>Store: Regenerate ID and save authenticated session (PII: user ID)
    alt Persistence succeeds
        API-->>Browser: New cookie, CSRF and user projection (PII: name, email, user ID)
    else Persistence fails
        API-->>Browser: 503, no authenticated success
    end
    Visitor->>Browser: Sign out
    Browser->>API: POST logout with cookie and CSRF
    API->>Store: Destroy current session
    alt Destruction succeeds
        API-->>Browser: 204 and clear cookie
        Browser->>Browser: Clear in-memory account and CSRF
    else Destruction fails
        API-->>Browser: 503, no revocation confirmation
    end
```

## Notes

- Cookies and CSRF tokens are sensitive on every protocol exchange.
- Invalid credentials and rejected CSRF stop before creating authenticated state.
- Replay and concurrency behavior require integration tests under R9.
