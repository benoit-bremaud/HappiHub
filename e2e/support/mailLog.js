// Reads the emails the API printed through its log transport (spec e2e-smoke-tests § 5, D3).
import { readFileSync } from 'node:fs';
import { API_LOG } from './paths.js';

/** Wait for the latest `template` email sent to `recipient` and return its payload link. */
export const waitForMailLink = async (template, recipient, { timeoutMs = 30_000 } = {}) => {
  const prefix = `[outbox] ${template} to ${recipient}: `;
  for (const end = Date.now() + timeoutMs; Date.now() < end;) {
    const line = readFileSync(API_LOG, 'utf8').split('\n').findLast((entry) => entry.startsWith(prefix));
    if (line) return JSON.parse(line.slice(prefix.length)).link;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No ${template} email for ${recipient} within ${timeoutMs} ms`);
};
