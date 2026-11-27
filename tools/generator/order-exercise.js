const be101OrderExercise = (() => {
  const demo = be101OrderDemo;
  let localState = demo.initialState();
  let workerReady;

  function controlOrderRequests() {
    if (!window.isSecureContext || location.protocol === 'file:' || !navigator.serviceWorker) {
      return Promise.resolve(false);
    }

    const workers = navigator.serviceWorker;
    const script = new URL('order-worker.js?v=2', document.baseURI).href;
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

  async function exchange(method, path, headers) {
    const requestHeaders = new Headers(headers);
    workerReady ??= Promise.resolve().then(controlOrderRequests).catch(() => false);
    if (!await workerReady) {
      const effect = demo.execute(localState, demo.route(method, path), requestHeaders);
      localState = effect.state;
      return {
        ...effect.response,
        path: '/' + path,
        body: effect.response.body === null ? '' : JSON.stringify(effect.response.body, null, 2),
        source: 'Локальная учебная модель в этой вкладке.',
      };
    }

    const url = new URL(path, document.baseURI);
    const response = await fetch(url, { method, headers: requestHeaders, cache: 'no-store' });
    if (response.headers.get('X-BE101-Practice') !== 'orders') {
      throw new Error('Unexpected response from the training API');
    }
    const responseHeaders = {};
    for (const name of ['Content-Type', 'Cache-Control', 'WWW-Authenticate']) {
      if (response.headers.has(name)) responseHeaders[name] = response.headers.get(name);
    }
    return {
      path: url.pathname,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: await response.text(),
      source: 'Учебный запрос доступен в DevTools → Network.',
    };
  }

  function element(tag, className, value) {
    const node = document.createElement(tag);
    node.className = className;
    if (value) node.textContent = value;
    return node;
  }

  function field(name, input) {
    const label = element('label', 'order-field', name);
    label.appendChild(input);
    return label;
  }

  function select(entries) {
    const input = element('select', '');
    for (const [name, value] of entries) {
      const option = element('option', '', name);
      option.value = value;
      input.appendChild(option);
    }
    return input;
  }

  function identitySelect() {
    return select([
      ['Анна, владелец', demo.owner],
      ['Борис, другой покупатель', demo.buyer],
      ['Без токена', ''],
    ]);
  }

  function credentials(token) {
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  function button(label, submit = false) {
    const control = element('button', 'btn', label);
    control.type = submit ? 'submit' : 'button';
    return control;
  }

  function mountRequest(slot, controls) {
    const form = element('form', '');
    form.appendChild(controls);
    const notice = element('p', 'order-notice');
    notice.setAttribute('role', 'status');
    const transcript = element('pre', 'order-transcript');
    transcript.hidden = true;
    slot.append(form, notice, transcript);

    async function send(method, path, headers) {
      if (controls.disabled) return;
      controls.disabled = true;
      transcript.hidden = true;
      notice.textContent = 'Отправляю запрос…';

      try {
        const result = await exchange(method, path, headers);
        transcript.textContent = [
          method + ' ' + result.path,
          ...Object.entries(headers).map(([name, value]) => name + ': ' + value),
          '',
          result.status + ' ' + result.statusText,
          ...Object.entries(result.headers).map(([name, value]) => name + ': ' + value),
          ...(result.body ? ['', result.body] : []),
        ].join('\n');
        transcript.hidden = false;
        notice.textContent = result.status + ' ' + result.statusText + '. ' + result.source;
        return result;
      } catch (_) {
        notice.textContent = 'Не удалось получить учебный ответ. Проверь поля запроса. При повторе отмены используй исходный ключ.';
      } finally {
        controls.disabled = false;
      }
    }

    return { form, send };
  }

  function mountRead(slot) {
    const showIdentity = slot.dataset.orderExercise === 'access';
    const controls = element('fieldset', 'order-request');
    const number = element('input', '');
    number.inputMode = 'numeric';
    number.pattern = '[0-9]{1,12}';
    number.required = true;
    number.maxLength = 12;
    number.value = String(demo.order.id);
    controls.appendChild(field('Номер заказа', number));

    const identity = identitySelect();
    if (showIdentity) controls.appendChild(field('Учебный пользователь', identity));
    controls.appendChild(button('Отправить GET', true));

    const { form, send } = mountRequest(slot, controls);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!demo.orderIdPattern.test(number.value)) return;
      const token = showIdentity ? identity.value : demo.owner;
      send('GET', 'api/orders/' + number.value, credentials(token));
    });
  }

  function mountCancel(slot) {
    const orderPath = 'api/orders/' + demo.order.id;
    const defaultKey = 'cancel-42-1';
    const controls = element('fieldset', 'order-request');
    const identity = identitySelect();
    const time = select(demo.times.map(value => [value.slice(11), value]));
    const key = element('input', 'order-key');
    key.value = defaultKey;
    key.spellcheck = false;
    controls.append(
      field('Учебный пользователь', identity),
      field('Время 16 января (UTC)', time),
      field('Idempotency-Key', key),
      button('Отправить POST /cancel', true),
    );

    const actions = element('div', 'order-actions');
    const getOrder = button('Прочитать заказ');
    const getRefunds = button('Проверить возвраты');
    const reset = button('Сбросить заказ');
    actions.append(getOrder, getRefunds, reset);
    controls.appendChild(actions);

    const { form, send } = mountRequest(slot, controls);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const headers = { ...credentials(identity.value), 'X-BE101-Time': time.value };
      if (key.value.trim()) headers['Idempotency-Key'] = key.value.trim();
      send('POST', orderPath + '/cancel', headers);
    });
    getOrder.addEventListener('click', () => send('GET', orderPath, credentials(identity.value)));
    getRefunds.addEventListener('click', () => send('GET', orderPath + '/refunds', credentials(identity.value)));
    reset.addEventListener('click', async () => {
      const result = await send('POST', demo.resetPath, {});
      if (result?.status === 204) {
        identity.value = demo.owner;
        time.value = demo.times[0];
        key.value = defaultKey;
      }
    });
  }

  function mount(slot) {
    if (slot.dataset.orderExercise === 'cancel') mountCancel(slot);
    else mountRead(slot);
  }

  return { mount };
})();
