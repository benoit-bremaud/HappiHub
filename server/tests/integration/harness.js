import { execFileSync } from 'node:child_process';
import pg from 'pg';
import request from 'supertest';
import { createApp } from '../../app.js';
import { createSessionStore } from '../../config/session.js';

export const origin = 'http://localhost:3000';
export const config = Object.freeze({ sessionSecret: 'synthetic-test-session-secret-32bytes', production: false,
  cookieName: 'happihub.sid', origin, port: 5000, trustedProxy: false, databaseUrl: process.env.TEST_DATABASE_URL });
export const PASSWORD = 'a quiet walk by the river';

/** Apply migrations through the operator step `jobs/migrate.js`, exactly as in production (L2). */
export const migrate = (direction = 'up', extra = []) => execFileSync('node', ['jobs/migrate.js', direction, ...extra],
  { cwd: `${__dirname}/../..`, env: { ...process.env, NODE_ENV: 'test', DATABASE_URL_TEST: process.env.TEST_DATABASE_URL }, stdio: 'pipe' });

export const createPool = () => new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 10 });

export const resetData = (pool) => pool.query(
  'TRUNCATE account, association, membership, invitation, auth_token, outbox_message, activity_entry, session CASCADE');

/** Fresh app per test with a controllable clock and the real PostgreSQL session store. */
export const buildApp = (pool, clock = { now: Date.now() }, overrides = {}) => {
  const store = createSessionStore(pool, () => {});
  const app = createApp({ ...config, ...overrides }, { store, db: pool, now: () => clock.now });
  return { app, store, clock };
};

/** Session identifier carried by a response cookie (rolling refreshes resend the same one). */
export const sessionId = (response) => response.headers['set-cookie']?.[0]?.match(/happihub\.sid=s%3A([^.]+)/)?.[1];

/** Browser-like client: keeps cookies, bootstraps CSRF, sends Origin on writes. */
export const browser = async (app) => {
  const agent = request.agent(app);
  const bootstrap = await agent.get('/api/session').set('Origin', origin);
  const state = { csrf: bootstrap.body.csrfToken, sessionId: sessionId(bootstrap) };
  const write = (method, path) => agent[method](path).set('Origin', origin).set('X-CSRF-Token', state.csrf);
  return {
    agent, state,
    get: (path) => agent.get(path).set('Origin', origin),
    post: (path, body = {}) => write('post', path).send(body),
    patch: (path, body = {}) => write('patch', path).send(body),
    del: (path, body = {}) => write('delete', path).send(body),
    /** Adopt the CSRF token returned when a session is opened. */
    adopt: (response) => { if (response.body.csrfToken) state.csrf = response.body.csrfToken; return response; },
  };
};

/** Last queued email to a recipient, with its token taken from the link fragment. */
export const lastEmail = async (pool, recipient, template) => {
  const { rows: [row] } = await pool.query(
    'SELECT template, payload FROM outbox_message WHERE recipient = $1 AND template = $2 ORDER BY created_at DESC, id LIMIT 1',
    [recipient, template]);
  return row && { ...row, token: row.payload?.link?.split('#')[1] };
};

/** Sign up, verify through the queued link, sign in (S1-C) and return the signed-in browser. */
export const signUpVerified = async (app, pool, email, associationName = 'Les Tréteaux') => {
  const client = await browser(app);
  await client.post('/api/signup', { email, password: PASSWORD, associationName });
  const { token } = await lastEmail(pool, email, 'VERIFY');
  await client.post('/api/email-verification', { token });
  client.adopt(await client.post('/api/session', { email, password: PASSWORD }));
  return client;
};
