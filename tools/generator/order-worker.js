self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

const courseScope = new URL(self.registration.scope);

async function serve(request, headers) {
  let result;
  try {
    result = await be101OrderStore.exchange(courseScope.href, request, headers);
  } catch (_) {
    result = be101OrderDemo.problem(503, 'Service Unavailable', 'DEMO_STORAGE_UNAVAILABLE');
  }
  const { status, statusText, body, headers: responseHeaders } = result;
  return new Response(body === null ? null : JSON.stringify(body, null, 2), {
    status, statusText, headers: { ...responseHeaders, 'X-BE101-Practice': 'orders' },
  });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== courseScope.origin || !url.pathname.startsWith(courseScope.pathname)) return;

  const route = be101OrderDemo.route(request.method, url.pathname.slice(courseScope.pathname.length));
  if (route) event.respondWith(serve(route, request.headers));
});
