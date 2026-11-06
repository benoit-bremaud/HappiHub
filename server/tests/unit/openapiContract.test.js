import path from 'node:path';
import express from 'express';
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

const toOpenApiPath = (expressPath) => expressPath.replace(/:(\w+)/g, '{$1}');

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

const API_MOUNT = /^\/api\/?(?=\/|$)/i.source;

const apiRouterOperations = (router) => router.stack.flatMap((inner) => {
  if (inner.handle?.stack) throw new Error('Nested router under /api: extend servedOperations');
  return inner.route ? routeOperations(inner.route, '/api') : [];
});

/**
 * Method + path pairs actually served by the app, `/api` router included. Reads Express 4
 * internals (`_router`, `layer.regexp`, `route.methods`): revisit on the Express 5 upgrade.
 */
const servedOperations = (app) => {
  if (!app._router?.stack) throw new Error('Express router internals changed: update servedOperations');
  return app._router.stack.flatMap((layer) => {
    if (layer.route) return routeOperations(layer.route, '');
    if (!layer.handle?.stack) return [];
    if (layer.regexp.source !== API_MOUNT) throw new Error(`Router mounted outside /api: ${layer.regexp}`);
    return apiRouterOperations(layer.handle);
  });
};

const contractOperations = (api) => Object.entries(api.paths).flatMap(([contractPath, item]) =>
  HTTP_METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${contractPath}`));

const diffOperations = (served, documented) => ({
  missingFromContract: [...served].filter((operation) => !documented.has(operation)).sort(),
  notServed: [...documented].filter((operation) => !served.has(operation)).sort(),
});

const makeApp = () => createApp(config, { cipher: testCipher, store: makeStore(), db: stubDb() });

let api;
beforeAll(async () => { api = await SwaggerParser.validate(CONTRACT); });

test('the contract is a valid OpenAPI 3.1 document', () => {
  expect(api.openapi).toBe('3.1.0');
});

test('every served route is in the contract and every contract operation is served', () => {
  const served = new Set(servedOperations(makeApp()));
  const documented = new Set(contractOperations(api));
  expect(diffOperations(served, documented)).toEqual({ missingFromContract: [], notServed: [] });
  expect(served.size).toBe(documented.size);
});

test('a route added under /api without a contract change is reported', () => {
  const app = makeApp();
  app.use('/api', express.Router().get('/extra/:event_id', (_req, res) => res.end()));
  const { missingFromContract } = diffOperations(new Set(servedOperations(app)), new Set(contractOperations(api)));
  expect(missingFromContract).toEqual(['GET /api/extra/{event_id}']);
});

test('a contract operation that is not served is reported', () => {
  const served = new Set(servedOperations(makeApp()));
  const { notServed } = diffOperations(served, new Set([...contractOperations(api), 'GET /api/gone']));
  expect(notServed).toEqual(['GET /api/gone']);
});

test('nested routers, other mounts and undocumented all-methods routes are refused', () => {
  const nested = makeApp();
  nested.use('/api', express.Router().use('/partners', express.Router().get('/x', (_req, res) => res.end())));
  expect(() => servedOperations(nested)).toThrow(/Nested router/);
  const root = makeApp();
  root.use(express.Router().get('/health', (_req, res) => res.end()));
  expect(() => servedOperations(root)).toThrow(/outside \/api/);
  expect(() => routeOperations({ path: '/other', methods: { _all: true } }, '/api')).toThrow(/all-methods/);
});
