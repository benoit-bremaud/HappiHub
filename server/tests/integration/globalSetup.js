// Disposable PostgreSQL for integration tests (spec § 8). TEST_DATABASE_URL points at an
// existing empty database instead (CI service container); otherwise a pinned image is started.
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');

const IMAGE = 'postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94';

const waitForDatabase = async (url) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const client = new Client({ connectionString: url });
    try { await client.connect(); await client.end(); return; }
    catch { await client.end().catch(() => {}); await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error('Disposable PostgreSQL did not start');
};

module.exports = async () => {
  if (!process.env.TEST_DATABASE_URL) {
    const id = execFileSync('docker', ['run', '-d', '--rm', '-e', 'POSTGRES_PASSWORD=happihub-test',
      '-e', 'POSTGRES_DB=happihub_test', '--tmpfs', '/var/lib/postgresql/data', '-p', '127.0.0.1::5432', IMAGE]).toString().trim();
    const port = execFileSync('docker', ['port', id, '5432/tcp']).toString().trim().split(':').pop();
    process.env.HAPPIHUB_TEST_CONTAINER = id;
    process.env.TEST_DATABASE_URL = `postgres://postgres:happihub-test@127.0.0.1:${port}/happihub_test`;
  }
  await waitForDatabase(process.env.TEST_DATABASE_URL);
};
