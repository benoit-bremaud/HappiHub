// Minimal static server for the production client bundle with the SPA fallback to
// index.html, like client/nginx.conf `try_files` (spec e2e-smoke-tests § 2). Loopback only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const [buildDir, port] = process.argv.slice(2);
const root = resolve(buildDir);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

const isFile = (path) => { try { return statSync(path).isFile(); } catch { return false; } };

createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const candidate = normalize(join(root, pathname));
  const found = candidate.startsWith(root + sep) && isFile(candidate);
  // A missing asset is a 404, so a broken bundle cannot pass as the SPA fallback.
  if (!found && extname(pathname)) { res.writeHead(404).end(); return; }
  const file = found ? candidate : join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(port), '127.0.0.1');
