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
