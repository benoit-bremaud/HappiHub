/** Expected domain refusal mapped to an HTTP answer by the controller layer. */
export class DomainError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
