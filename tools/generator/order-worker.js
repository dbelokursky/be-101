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
