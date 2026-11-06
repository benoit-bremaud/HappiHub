import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { createApp } from '../../app.js';
import { testCipher } from '../testCipher.js';
import { config, makeStore, stubDb } from '../sessionFixture.js';

const CONTRACT = path.resolve(__dirname, '../../../docs/api/openapi.yaml');
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
// The disabled legacy comment routes are one `router.all` over a wildcard; the contract
// documents them once as `/api/comments` with the usual methods (spec D1). Any other
// wildcard or `all` route is drift.
const LEGACY_COMMENTS = { paths: ['/comments', '/comments/*'], documented: '/api/comments',
  methods: ['get', 'post', 'put', 'patch', 'delete'] };

const toOpenApiPath = (expressPath) => expressPath.replace(/:([A-Za-z]+)/g, '{$1}');

const routeOperations = (route, prefix) => {
  const methods = Object.keys(route.methods);
  if (route.methods._all) {
    const isLegacy = prefix === '/api' && JSON.stringify(route.path) === JSON.stringify(LEGACY_COMMENTS.paths);
    if (!isLegacy) throw new Error(`Undocumentable all-methods route: ${prefix}${route.path}`);
    return LEGACY_COMMENTS.methods.map((method) => `${method.toUpperCase()} ${LEGACY_COMMENTS.documented}`);
  }
  return [route.path].flat().flatMap((routePath) =>
    methods.map((method) => `${method.toUpperCase()} ${toOpenApiPath(prefix + routePath)}`));
};

/** Method + path pairs actually served by the app, `/api` router included. */
const servedOperations = (app) => app._router.stack.flatMap((layer) => {
  if (layer.route) return routeOperations(layer.route, '');
  if (!layer.handle?.stack) return [];
  if (!layer.regexp.test('/api')) throw new Error(`Router mounted outside /api: ${layer.regexp}`);
  return layer.handle.stack.filter((inner) => inner.route).flatMap((inner) => routeOperations(inner.route, '/api'));
});

const contractOperations = (api) => Object.entries(api.paths).flatMap(([contractPath, item]) =>
  HTTP_METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${contractPath}`));

const app = createApp(config, { cipher: testCipher, store: makeStore(), db: stubDb() });

test('the contract is a valid OpenAPI 3.1 document', async () => {
  const api = await SwaggerParser.validate(CONTRACT);
  expect(api.openapi).toBe('3.1.0');
});

test('every served route is in the contract and every contract operation is served', async () => {
  const api = await SwaggerParser.parse(CONTRACT);
  const served = new Set(servedOperations(app));
  const documented = new Set(contractOperations(api));
  const missingFromContract = [...served].filter((operation) => !documented.has(operation)).sort();
  const notServed = [...documented].filter((operation) => !served.has(operation)).sort();
  expect({ missingFromContract, notServed }).toEqual({ missingFromContract: [], notServed: [] });
  expect(served.size).toBeGreaterThan(30);
});

test('the drift check reports a route added without a contract change', () => {
  const extra = createApp(config, { cipher: testCipher, store: makeStore(), db: stubDb() });
  extra.get('/api-extra/:id', (_req, res) => res.end());
  expect(servedOperations(extra)).toContain('GET /api-extra/{id}');
});

test('an undocumented all-methods route is refused', () => {
  expect(() => routeOperations({ path: '/other', methods: { _all: true } }, '/api')).toThrow(/all-methods/);
});
