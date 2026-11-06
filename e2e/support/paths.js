// Shared locations and ports of one E2E run (spec e2e-smoke-tests § 2).
const root = new URL('../../', import.meta.url).pathname;

export const SERVER_DIR = `${root}server`;
export const CLIENT_DIR = `${root}client`;
export const RUN_DIR = `${root}e2e/.run`;
export const BUILD_DIR = `${RUN_DIR}/build`;
export const API_LOG = `${RUN_DIR}/api.log`;
export const CREDENTIALS_FILE = `${SERVER_DIR}/.demo-credentials.local.json`;
export const API_PORT = Number(process.env.E2E_API_PORT || 5100);
export const WEB_PORT = Number(process.env.E2E_WEB_PORT || 3100);
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
