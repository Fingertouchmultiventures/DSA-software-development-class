import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const specification = JSON.parse(
  await readFile(new URL('../docs/openapi.json', import.meta.url), 'utf8'),
);

const implementedOperations = [
  ['get', '/health'],
  ['get', '/api/events'],
  ['post', '/api/events'],
  ['get', '/api/events/{id}'],
  ['post', '/api/events/{id}/tiers'],
  ['post', '/api/events/{id}/publish'],
  ['post', '/api/events/{id}/unpublish'],
  ['post', '/api/bookings'],
  ['get', '/api/bookings/{reference}'],
  ['post', '/api/bookings/{reference}/pay'],
  ['post', '/api/bookings/{reference}/cancel'],
];

function assertReferencesResolve(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertReferencesResolve(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  if (typeof value.$ref === 'string') {
    assert.ok(value.$ref.startsWith('#/'), `external reference at ${path}`);
    const target = value.$ref.slice(2).split('/').reduce(
      (current, key) => current?.[key.replace(/~1/g, '/').replace(/~0/g, '~')],
      specification,
    );
    assert.notEqual(target, undefined, `unresolved reference ${value.$ref} at ${path}`);
  }

  for (const [key, child] of Object.entries(value)) {
    assertReferencesResolve(child, `${path}.${key}`);
  }
}

describe('OpenAPI contract', () => {
  it('is an OpenAPI 3.1 document with resolvable local references', () => {
    assert.equal(specification.openapi, '3.1.0');
    assertReferencesResolve(specification);
  });

  it('documents every implemented route with an operation and response', () => {
    for (const [method, route] of implementedOperations) {
      const operation = specification.paths[route]?.[method];
      assert.ok(operation, `${method.toUpperCase()} ${route} is documented`);
      assert.ok(operation.operationId);
      assert.ok(operation.responses && Object.keys(operation.responses).length > 0);
    }
  });

  it('describes the implemented event search query and SQLite Build 5 behavior', () => {
    const search = specification.paths['/api/events'].get;
    const queryNames = search.parameters.map((parameter) => parameter.name);
    assert.deepEqual(queryNames, [
      'q',
      'city',
      'from',
      'to',
      'maxPriceCents',
      'onlyAvailable',
      'sort',
    ]);
    assert.match(specification.info.description, /Build 5.*SQLite.*atomically/s);
  });

  it('labels proposed operations as not implemented', () => {
    for (const [path, methods] of Object.entries(specification.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        if (/\(Build [789]\)/.test(operation.tags?.[0] ?? '')) {
          assert.match(operation.description ?? '', /proposed/i, `${method} ${path}`);
        }
      }
    }
  });
});
