/**
 * Expected domain refusal mapped to an HTTP answer by the controller layer (`handle.js`).
 * `details` keys are spread into the response body, except `retryAfter` (seconds), which
 * becomes the `Retry-After` header; brick B passes `{code, details?}` here.
 */
export class DomainError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
