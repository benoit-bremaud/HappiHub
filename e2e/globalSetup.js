// Prepares one disposable run (spec e2e-smoke-tests § 2): PostgreSQL container, keyring,
// migrations, demo seed, production client bundle, API and static server. The returned
// function is the teardown; it also runs when a step fails, so nothing is left behind.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { API_LOG, API_PORT, API_URL, BUILD_DIR, CLIENT_DIR, RUN_DIR, SERVER_DIR, WEB_PORT, WEB_URL } from './support/paths.js';

// Same pinned image as the server integration harness (server/tests/integration/globalSetup.cjs).
const IMAGE = 'postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94';
const DATABASE = 'happihub_e2e_demo';

const run = (command, args, options) => execFileSync(command, args, { stdio: ['ignore', 'pipe', 'inherit'], ...options });

const assertPortFree = (port) => new Promise((resolve, reject) => {
  const probe = createServer().once('error', () => reject(new Error(`Port ${port} is busy; set E2E_API_PORT / E2E_WEB_PORT`)))
    .listen(port, '127.0.0.1', () => probe.close(resolve));
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Waits for a child process to answer; fails at once when the process has exited.
const waitFor = async (url, what, child) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`${what} exited with code ${child.exitCode}`);
    try { if ((await fetch(url)).status < 500) return; } catch { /* not up yet */ }
    await delay(500);
  }
  throw new Error(`${what} did not answer at ${url}`);
};

// Retries the migrations while PostgreSQL starts; the last error is reported, not swallowed.
const migrateWhenReady = async (env) => {
  let last = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { run('npm', ['run', '--silent', 'migrate'], { cwd: SERVER_DIR, env, stdio: 'pipe' }); return; }
    catch (error) { last = error.stderr?.toString().trim().split('\n').slice(-5).join('\n'); await delay(500); }
  }
  throw new Error(`The migrations failed on the disposable PostgreSQL:\n${last}`);
};

// On a setup failure the API log is deleted with the run folder, so its tail is printed first.
const printLogTail = () => {
  try { console.error(`Last API log lines:\n${readFileSync(API_LOG, 'utf8').split('\n').slice(-30).join('\n')}`); }
  catch { /* no log yet */ }
};

export const globalSetup = async () => {
  const cleanups = [];
  const teardown = async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      try { await cleanup(); } catch (error) { console.warn(`E2E teardown step failed: ${error.message}`); }
    }
  };
  // Ctrl-C or a crash must not leave the container running (AC1).
  const onExit = async () => { await teardown(); process.exit(130); };
  process.once('SIGINT', onExit);
  process.once('SIGTERM', onExit);
  try {
    await Promise.all([assertPortFree(API_PORT), assertPortFree(WEB_PORT)]);
    rmSync(RUN_DIR, { recursive: true, force: true });
    mkdirSync(RUN_DIR, { recursive: true, mode: 0o700 });
    cleanups.push(() => rmSync(RUN_DIR, { recursive: true, force: true }));

    const dbPassword = randomBytes(18).toString('base64url');
    // The command line holds the throw-away password, so a failure is reported without it.
    let container;
    try { container = run('docker', ['run', '-d', '--rm', '-e', `POSTGRES_PASSWORD=${dbPassword}`,
      '-e', `POSTGRES_DB=${DATABASE}`, '--tmpfs', '/var/lib/postgresql/data', '-p', '127.0.0.1::5432', IMAGE],
      { stdio: 'pipe' }).toString().trim(); }
    catch { throw new Error('docker run of the disposable PostgreSQL failed (is Docker running?)'); }
    cleanups.push(() => run('docker', ['rm', '-f', container]));
    const dbPort = run('docker', ['port', container, '5432/tcp']).toString().trim().split('\n')[0].split(':').pop();

    const keyring = `${RUN_DIR}/field-keyring.json`;
    run('npm', ['run', '--silent', 'keyring:generate', '--', keyring], { cwd: SERVER_DIR });

    // DEV tier (spec § 2). Every key is set explicitly, so a developer's server/.env* file
    // (read by dotenv-flow, which never overrides) cannot point the run elsewhere.
    const env = { ...process.env, NODE_ENV: '',
      DATABASE_URL_DEV: `postgres://postgres:${dbPassword}@127.0.0.1:${dbPort}/${DATABASE}`,
      DATABASE_URL_PROD: '', FIELD_KEYRING_FILE_PROD: '', FIELD_KEYRING_FILE_DEV: keyring,
      SESSION_SECRET_DEV: randomBytes(32).toString('base64url'),
      APP_URL_DEV: WEB_URL, PORT_DEV: String(API_PORT) };
    await migrateWhenReady(env);
    // The seed keeps the passwords of an existing credentials file and creates it otherwise (#251 § 6).
    run('npm', ['run', '--silent', 'seed:demo', '--', '--confirm'], { cwd: SERVER_DIR, env });

    run('npm', ['run', '--silent', 'build'], { cwd: CLIENT_DIR, env: { ...process.env, CI: 'false',
      BUILD_PATH: BUILD_DIR, REACT_APP_API_URL: `${API_URL}/api`,
      GENERATE_SOURCEMAP: 'false', INLINE_RUNTIME_CHUNK: 'false' } });

    const apiLog = createWriteStream(API_LOG, { mode: 0o600 });
    const api = spawn('node', ['server.js'], { cwd: SERVER_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
    api.stdout.pipe(apiLog);
    api.stderr.pipe(apiLog);
    cleanups.push(() => { api.kill(); });
    const web = spawn('node', [fileURLToPath(new URL('./serveBuild.js', import.meta.url)), BUILD_DIR, String(WEB_PORT)],
      { stdio: ['ignore', 'inherit', 'inherit'] });
    cleanups.push(() => { web.kill(); });

    await Promise.all([waitFor(`${API_URL}/ready`, 'API', api), waitFor(WEB_URL, 'Static server', web)]);
  } catch (error) {
    printLogTail();
    process.off('SIGINT', onExit);
    process.off('SIGTERM', onExit);
    await teardown();
    throw error;
  }
  return async () => {
    process.off('SIGINT', onExit);
    process.off('SIGTERM', onExit);
    await teardown();
  };
};

// Playwright loads the global setup from the default export only.
export default globalSetup;
