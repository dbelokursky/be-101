const be101OrderExercise = (() => {
  function controlOrderRequests() {
    if (!window.isSecureContext || location.protocol === 'file:' || !navigator.serviceWorker) {
      return Promise.resolve(false);
    }

    const workers = navigator.serviceWorker;
    const script = new URL('order-worker.js', document.baseURI).href;
    const controlsPage = () => workers.controller?.scriptURL === script;
    if (controlsPage()) return Promise.resolve(true);

    return new Promise(resolve => {
      const timer = setTimeout(() => finish(false), 2500);
      function finish(ready) {
        clearTimeout(timer);
        workers.removeEventListener('controllerchange', onControllerChange);
        resolve(ready);
      }
      function onControllerChange() {
        if (controlsPage()) finish(true);
      }
      workers.addEventListener('controllerchange', onControllerChange);
      workers.register(script).then(onControllerChange, () => finish(false));
    });
  }

  async function exchange(id, authorization) {
    const url = new URL('api/orders/' + id, document.baseURI);
    const request = [
      'GET ' + url.pathname,
      ...(authorization ? ['Authorization: ' + authorization] : []),
    ].join('\n');

    try {
      if (await controlOrderRequests()) {
        const response = await fetch(url, {
          headers: authorization ? { Authorization: authorization } : {},
          cache: 'no-store',
        });
        if (response.headers.get('X-BE101-Practice') === 'orders') {
          const headers = {};
          for (const name of ['Content-Type', 'Cache-Control', 'WWW-Authenticate']) {
            if (response.headers.has(name)) headers[name] = response.headers.get(name);
          }
          return {
            request,
            status: response.status,
            statusText: response.statusText,
            headers,
            body: await response.text(),
            source: 'Учебный запрос доступен в DevTools → Network.',
          };
        }
      }
    } catch (_) {
      // Сохранённый пример доступен без сетевого обмена.
    }

    const sample = be101OrderDemo.readOrder(id, authorization);
    return {
      ...sample,
      request: 'GET /api/orders/' + id +
        (authorization ? '\nAuthorization: ' + authorization : ''),
      body: JSON.stringify(sample.body, null, 2),
      source: 'Сохранённый пример обмена.',
    };
  }

  function element(tag, className, value) {
    const node = document.createElement(tag);
    node.className = className;
    if (value) node.textContent = value;
    return node;
  }

  function mount(slot) {
    const showIdentity = slot.dataset.orderExercise === 'access';
    const form = element('form', 'order-request');
    const label = element('label', 'order-field', 'Номер заказа');
    const number = element('input', '');
    number.inputMode = 'numeric';
    number.pattern = '[0-9]{1,12}';
    number.required = true;
    number.maxLength = 12;
    number.value = String(be101OrderDemo.order.id);
    label.appendChild(number);
    form.appendChild(label);

    const identity = element('select', '');
    if (showIdentity) {
      const identityLabel = element('label', 'order-field', 'Учебный пользователь');
      const entries = [
        ['Анна, владелец', be101OrderDemo.owner],
        ['Борис, другой покупатель', be101OrderDemo.buyer],
        ['Без токена', ''],
      ];
      for (const [name, token] of entries) {
        const option = element('option', '', name);
        option.value = token;
        identity.appendChild(option);
      }
      identityLabel.appendChild(identity);
      form.appendChild(identityLabel);
    }

    const send = element('button', 'btn', 'Отправить GET');
    send.type = 'submit';
    form.appendChild(send);
    const notice = element('p', 'order-notice');
    notice.setAttribute('role', 'status');
    const transcript = element('pre', 'order-transcript');
    transcript.hidden = true;
    slot.append(form, notice, transcript);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const id = number.value;
      if (!be101OrderDemo.orderIdPattern.test(id)) return;
      const token = showIdentity ? identity.value : be101OrderDemo.owner;
      send.disabled = true;
      notice.textContent = 'Отправляю запрос…';
      const result = await exchange(id, token ? 'Bearer ' + token : '');
      transcript.textContent = [
        result.request,
        '',
        result.status + ' ' + result.statusText,
        ...Object.entries(result.headers).map(([name, value]) => name + ': ' + value),
        '',
        result.body,
      ].join('\n');
      transcript.hidden = false;
      notice.textContent = result.status + ' ' + result.statusText + '. ' + result.source;
      send.disabled = false;
    });
  }

  return { mount };
})();
