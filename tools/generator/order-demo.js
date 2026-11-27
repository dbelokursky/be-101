/* Учебный API заказа. Токены и время относятся к этому сценарию. */
const be101OrderDemo = (() => {
  const owner = 'demo-anna';
  const buyer = 'demo-boris';
  const order = { id: 42, status: 'NEW', createdAt: '2026-01-15T12:00:00Z' };
  const orderIdPattern = /^[0-9]{1,12}$/;
  const times = [
    '2026-01-16T11:59:59Z',
    '2026-01-16T12:00:00Z',
    '2026-01-16T12:00:01Z',
  ];
  const resetPath = 'api/demo/reset-order';
  const routes = {
    'GET:': 'order',
    'GET:refunds': 'refunds',
    'POST:cancel': 'cancel',
  };

  function route(method, path) {
    if (method === 'POST' && path === resetPath) return { action: 'reset' };
    const match = /^api\/orders\/([^/]+)(?:\/(cancel|refunds))?$/.exec(path);
    if (!match || !orderIdPattern.test(match[1])) return null;
    const action = routes[method + ':' + (match[2] || '')];
    return action ? { action, id: match[1] } : null;
  }

  function initialState() {
    return { order: { ...order }, refunds: [], successfulKey: null };
  }

  function response(status, statusText, body, extraHeaders) {
    const headers = { 'Cache-Control': 'no-store', ...extraHeaders };
    if (body !== null) {
      headers['Content-Type'] = status === 200 ? 'application/json' : 'application/problem+json';
    }
    return { status, statusText, body, headers };
  }

  function problem(status, statusText, code, headers) {
    const body = { title: statusText, status, ...(code ? { code } : {}) };
    return response(status, statusText, body, headers);
  }

  function accessError(id, authorization) {
    const credential = /^Bearer +(\S+)$/i.exec(authorization || '');
    const token = credential && credential[1];
    if (token !== owner && token !== buyer) {
      return problem(401, 'Unauthorized', null, {
        'WWW-Authenticate': 'Bearer realm="be101"',
      });
    }
    if (id !== String(order.id)) return problem(404, 'Not Found');
    if (token !== owner) return problem(403, 'Forbidden');
    return null;
  }

  function cancel(state, headers) {
    const key = headers.get('Idempotency-Key')?.trim();
    const unchanged = result => ({ state, response: result });
    if (!key) return unchanged(problem(400, 'Bad Request', 'IDEMPOTENCY_KEY_REQUIRED'));
    if (key === state.successfulKey) return unchanged(response(204, 'No Content', null));
    if (state.order.status === 'CANCELLED') {
      return unchanged(problem(409, 'Conflict', 'ORDER_ALREADY_CANCELLED'));
    }

    const now = headers.get('X-BE101-Time') ?? times[0];
    if (!times.includes(now)) return unchanged(problem(400, 'Bad Request', 'INVALID_DEMO_TIME'));
    const deadline = Date.parse(state.order.createdAt) + 24 * 60 * 60 * 1000;
    if (Date.parse(now) >= deadline) {
      return unchanged(problem(409, 'Conflict', 'CANCELLATION_WINDOW_EXPIRED'));
    }

    const refund = {
      id: 'refund-42',
      orderId: state.order.id,
      amount: 120,
      reason: 'ORDER_CANCELLED',
      createdAt: now,
    };
    return {
      state: {
        order: { ...state.order, status: 'CANCELLED', cancelledAt: now },
        refunds: [...state.refunds, refund],
        successfulKey: key,
      },
      response: response(204, 'No Content', null),
    };
  }

  function execute(state, request, headers) {
    if (request.action === 'reset') {
      return { state: initialState(), response: response(204, 'No Content', null) };
    }
    const denied = accessError(request.id, headers.get('Authorization'));
    if (denied) return { state, response: denied };
    if (request.action === 'cancel') return cancel(state, headers);
    const body = request.action === 'refunds' ? state.refunds : state.order;
    return { state, response: response(200, 'OK', body) };
  }

  return { owner, buyer, order, orderIdPattern, times, resetPath, route, initialState, execute, problem };
})();
