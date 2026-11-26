/* Учебные данные первого упражнения. Токены относятся только к этой модели. */
const be101OrderDemo = (() => {
  const owner = 'demo-anna';
  const buyer = 'demo-boris';
  const order = { id: 42, status: 'NEW', createdAt: '2026-01-15T12:00:00Z' };
  const orderIdPattern = /^[0-9]{1,12}$/;

  function response(status, statusText, body, extraHeaders) {
    const headers = {
      'Content-Type': status === 200 ? 'application/json' : 'application/problem+json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    };
    return { status, statusText, body, headers };
  }

  function readOrder(id, authorization) {
    const credential = /^Bearer +(\S+)$/i.exec(authorization || '');
    const token = credential && credential[1];
    if (token !== owner && token !== buyer) {
      return response(401, 'Unauthorized', { title: 'Unauthorized', status: 401 }, {
        'WWW-Authenticate': 'Bearer realm="be101"',
      });
    }
    if (id !== String(order.id)) {
      return response(404, 'Not Found', { title: 'Not Found', status: 404 });
    }
    if (token !== owner) {
      return response(403, 'Forbidden', { title: 'Forbidden', status: 403 });
    }
    return response(200, 'OK', order);
  }

  return { owner, buyer, order, orderIdPattern, readOrder };
})();

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

const orderEndpoint = new URL('api/orders/', self.registration.scope);

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== orderEndpoint.origin ||
    !url.pathname.startsWith(orderEndpoint.pathname)
  ) return;

  const id = url.pathname.slice(orderEndpoint.pathname.length);
  if (!be101OrderDemo.orderIdPattern.test(id)) return;

  const { status, statusText, body, headers } =
    be101OrderDemo.readOrder(id, request.headers.get('Authorization'));
  event.respondWith(new Response(JSON.stringify(body, null, 2), {
    status, statusText, headers: { ...headers, 'X-BE101-Practice': 'orders' },
  }));
});
