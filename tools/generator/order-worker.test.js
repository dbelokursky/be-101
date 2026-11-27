'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scope = 'https://course.example.test/be-101/';
const owner = 'Bearer demo-anna';
const before = '2026-01-16T11:59:59Z';
const boundary = '2026-01-16T12:00:00Z';
const after = '2026-01-16T12:00:01Z';
const source = ['order-demo.js', 'order-worker.js']
  .map(file => fs.readFileSync(path.join(__dirname, file), 'utf8'))
  .join('\n');

function createClient() {
  const listeners = new Map();
  const context = vm.createContext({
    self: {
      registration: { scope },
      addEventListener: (event, handler) => listeners.set(event, handler),
    },
    be101OrderStore: {
      async exchange(key, request, headers) {
        assert.equal(key, scope);
        const effect = demo.execute(state, request, headers);
        state = effect.state;
        return effect.response;
      },
    },
    Response,
    URL,
  });
  vm.runInContext(source, context);
  const demo = vm.runInContext('be101OrderDemo', context);
  let state = demo.initialState();

  function request(relativeUrl, { authorization, method = 'GET', key, time } = {}) {
    let response;
    const headers = new Headers();
    if (authorization) headers.set('Authorization', authorization);
    if (key !== undefined) headers.set('Idempotency-Key', key);
    if (time) headers.set('X-BE101-Time', time);
    listeners.get('fetch')({
      request: new Request(new URL(relativeUrl, scope), { headers, method }),
      respondWith: result => { response = result; },
    });
    return response;
  }

  return {
    request,
    cancel: options => request('api/orders/42/cancel', { method: 'POST', authorization: owner, ...options }),
    refundLog: () => request('api/orders/42/refunds', { authorization: owner }),
  };
}

test('владелец читает учебный заказ под префиксом сайта', async () => {
  const client = createClient();
  const response = await client.request('api/orders/42', { authorization: owner });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-BE101-Practice'), 'orders');
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(await response.json(), { id: 42, status: 'NEW', createdAt: '2026-01-15T12:00:00Z' });
});

test('аутентификация, право владения и отсутствующий заказ различаются', async () => {
  const client = createClient();
  for (const authorization of [undefined, 'Bearer invalid']) {
    const response = await client.request('api/orders/42', { authorization });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('WWW-Authenticate'), 'Bearer realm="be101"');
  }
  const forbidden = await client.request('api/orders/42', { authorization: 'bearer demo-boris' });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('Content-Type'), 'application/problem+json');
  assert.equal((await forbidden.json()).status, 403);
  const absent = await client.request('api/orders/999', { authorization: owner });
  assert.equal(absent.status, 404);
});

test('обработчик перехватывает только учебные маршруты и методы в области курса', () => {
  const { request } = createClient();
  assert.equal(request('index.html'), undefined);
  assert.equal(request('/api/orders/42'), undefined);
  assert.equal(request('api/orders/text'), undefined);
  assert.equal(request('api/orders/text/cancel', { method: 'POST' }), undefined);
  assert.equal(request('api/orders/42/cancel'), undefined);
  assert.equal(request('api/orders/42', { method: 'POST' }), undefined);
  assert.equal(request('api/orders/42/refunds', { method: 'POST' }), undefined);
  assert.equal(request('api/demo/reset-order'), undefined);
  assert.equal(request('https://elsewhere.example.test/be-101/api/orders/42'), undefined);
});

test('отмена и повтор после истечения срока дают 204 и единственный возврат', async () => {
  const client = createClient();
  const first = await client.cancel({ key: 'cancel-42-1', time: before });
  assert.equal(first.status, 204);
  assert.equal(first.headers.get('Content-Type'), null);
  assert.equal(await first.text(), '');

  const repeat = await client.cancel({ key: 'cancel-42-1', time: after });
  assert.equal(repeat.status, 204);
  assert.equal(await repeat.text(), '');

  const conflict = await client.cancel({ key: 'cancel-42-2', time: after });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'ORDER_ALREADY_CANCELLED');

  const response = await client.request('api/orders/42', { authorization: owner });
  const order = await response.json();
  assert.equal(order.status, 'CANCELLED');
  assert.equal(order.cancelledAt, before);

  const refunds = await client.refundLog();
  assert.deepEqual(await refunds.json(), [{
    id: 'refund-42',
    orderId: 42,
    amount: 120,
    reason: 'ORDER_CANCELLED',
    createdAt: before,
  }]);
});

test('первый запрос на границе и после неё оставляет заказ и возвраты без изменений', async () => {
  for (const time of [boundary, after]) {
    const client = createClient();
    const rejected = await client.cancel({ key: 'cancel-42-1', time });
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).code, 'CANCELLATION_WINDOW_EXPIRED');
    assert.deepEqual(await (await client.refundLog()).json(), []);
    const order = await client.request('api/orders/42', { authorization: owner });
    assert.equal((await order.json()).status, 'NEW');
  }
});

test('отмена проверяет полномочия, номер заказа и обязательный ключ', async () => {
  const client = createClient();
  assert.equal((await client.cancel({ authorization: undefined, key: 'cancel-42-1' })).status, 401);
  assert.equal((await client.cancel({ authorization: 'Bearer demo-boris', key: 'cancel-42-1' })).status, 403);
  assert.equal((await client.request('api/orders/99/cancel', {
    authorization: owner, method: 'POST', key: 'cancel-42-1',
  })).status, 404);
  const missing = await client.cancel({ key: '   ' });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).code, 'IDEMPOTENCY_KEY_REQUIRED');
  assert.deepEqual(await (await client.refundLog()).json(), []);
});

test('сброс восстанавливает заказ, журнал и историю повтора', async () => {
  const client = createClient();
  assert.equal((await client.cancel({ key: 'cancel-42-1' })).status, 204);
  const reset = await client.request('api/demo/reset-order', { method: 'POST' });
  assert.equal(reset.status, 204);
  assert.deepEqual(await (await client.refundLog()).json(), []);
  const order = await client.request('api/orders/42', { authorization: owner });
  assert.equal((await order.json()).status, 'NEW');
  assert.equal((await client.cancel({ key: 'cancel-42-1', time: boundary })).status, 409);
  assert.equal((await client.cancel({ key: 'cancel-42-1', time: before })).status, 204);
});
