'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scope = 'https://course.example.test/be-101/';
const source = ['order-demo.js', 'order-worker.js']
  .map(file => fs.readFileSync(path.join(__dirname, file), 'utf8'))
  .join('\n');
const listeners = new Map();
vm.runInNewContext(source, {
  self: {
    registration: { scope },
    addEventListener: (event, handler) => listeners.set(event, handler),
  },
  Response,
  URL,
});

function makeRequest(relativeUrl, { authorization, method = 'GET' } = {}) {
  let response;
  const headers = authorization ? { Authorization: authorization } : {};
  listeners.get('fetch')({
    request: new Request(new URL(relativeUrl, scope), { headers, method }),
    respondWith: result => { response = result; },
  });
  return response;
}

test('владелец читает учебный заказ под префиксом сайта', async () => {
  const response = makeRequest('api/orders/42', { authorization: 'Bearer demo-anna' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-BE101-Practice'), 'orders');
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(await response.json(), { id: 42, status: 'NEW', createdAt: '2026-01-15T12:00:00Z' });
});

test('аутентификация, право владения и отсутствующий заказ различаются', async () => {
  for (const authorization of [undefined, 'Bearer invalid']) {
    const response = makeRequest('api/orders/42', { authorization });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('WWW-Authenticate'), 'Bearer realm="be101"');
  }
  const forbidden = makeRequest('api/orders/42', { authorization: 'bearer demo-boris' });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('Content-Type'), 'application/problem+json');
  assert.equal((await forbidden.json()).status, 403);
  const absent = makeRequest('api/orders/999', { authorization: 'Bearer demo-anna' });
  assert.equal(absent.status, 404);
});

test('обработчик принимает только GET учебного заказа в области курса', () => {
  assert.equal(makeRequest('index.html'), undefined);
  assert.equal(makeRequest('/api/orders/42'), undefined);
  assert.equal(makeRequest('api/orders/text'), undefined);
  assert.equal(makeRequest('api/orders/42/cancel'), undefined);
  assert.equal(makeRequest('api/orders/42', { method: 'POST' }), undefined);
  assert.equal(makeRequest('https://elsewhere.example.test/be-101/api/orders/42'), undefined);
});
