const be101OrderCompatibility = (() => {
  const clients = ['1.4', '1.5'];
  const samples = [
    { api: '1.8', status: 'NEW', expected: { label: 'Новый', canCancel: true } },
    { api: '1.8', status: 'CANCELLED', expected: { label: 'Отменён', canCancel: false } },
    { api: '1.9', status: 'PAYMENT_PENDING', expected: { label: 'Ожидает подтверждения оплаты', canCancel: false } },
  ].map(sample => ({
    ...sample,
    response: { id: 42, status: sample.status, createdAt: '2026-01-15T12:00:00Z' },
  }));

  function renderOrder(client, response) {
    if (response.status === 'NEW') return { label: 'Новый', canCancel: true };
    if (response.status === 'CANCELLED') return { label: 'Отменён', canCancel: false };
    if (client === '1.5' && response.status === 'PAYMENT_PENDING') {
      return { label: 'Ожидает подтверждения оплаты', canCancel: false };
    }
    throw new Error('Клиент ' + client + ' получил неизвестный статус «' + response.status + '».');
  }

  function cardText(card) {
    return card.label + '. Кнопка отмены ' + (card.canCancel ? 'активна.' : 'отключена.');
  }

  function sampleLabel(sample) {
    return 'API ' + sample.api + ' · ' + sample.status;
  }

  function check(client, sample) {
    try {
      const card = renderOrder(client, sample.response);
      return {
        actual: cardText(card),
        passed: card.label === sample.expected.label && card.canCancel === sample.expected.canCancel,
      };
    } catch (error) {
      return { actual: 'Ошибка карточки. ' + error.message, passed: false };
    }
  }

  function runChecks(client) {
    return samples.map(sample => ({
      label: sampleLabel(sample),
      expected: cardText(sample.expected),
      ...check(client, sample),
    }));
  }

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  function selectField(parent, name, entries) {
    const field = element('label', name);
    field.className = 'order-field';
    const select = element('select');
    for (const [value, title] of entries) {
      const option = element('option', title);
      option.value = value;
      select.appendChild(option);
    }
    field.appendChild(select);
    parent.appendChild(field);
    return select;
  }

  function mount(slot) {
    const controls = element('div');
    controls.className = 'order-request';
    const responseSelect = selectField(controls, 'Ответ API',
      samples.map((sample, index) => [String(index), sampleLabel(sample)]));
    const clientSelect = selectField(controls, 'Сборка клиента',
      clients.map(client => [client, 'Клиент ' + client]));
    const run = element('button', 'Прогнать проверки');
    run.type = 'button';
    run.className = 'btn';
    controls.appendChild(run);

    const response = element('pre');
    response.setAttribute('aria-label', 'HTTP-запрос и ответ');
    const card = element('p');
    card.setAttribute('role', 'status');
    const report = element('div');
    report.className = 'compatibility-checks';
    slot.append(controls, response, card, report);

    function showResponse() {
      const sample = samples[Number(responseSelect.value)];
      const result = check(clientSelect.value, sample);
      response.textContent = [
        'GET /api/orders/42',
        '',
        'HTTP/1.1 200 OK',
        'Content-Type: application/json',
        '',
        JSON.stringify(sample.response, null, 2),
      ].join('\n');
      card.textContent = result.actual;
      card.classList.toggle('compatibility-failure', !result.passed);
    }

    function showChecks() {
      const checks = runChecks(clientSelect.value);
      const passed = checks.filter(result => result.passed).length;
      const table = element('table');
      table.appendChild(element('caption',
        'Клиент ' + clientSelect.value + ' прошёл ' + passed + ' из ' + checks.length + ' проверок'));
      const headings = table.createTHead().insertRow();
      for (const title of ['Ответ API', 'Ожидание', 'Факт', 'Результат']) {
        const heading = element('th', title);
        heading.scope = 'col';
        headings.appendChild(heading);
      }
      const body = table.createTBody();
      for (const result of checks) {
        const row = body.insertRow();
        row.insertCell().textContent = result.label;
        row.insertCell().textContent = result.expected;
        row.insertCell().textContent = result.actual;
        const resultCell = row.insertCell();
        resultCell.textContent = result.passed ? 'Пройдена' : 'Сбой';
        resultCell.classList.toggle('compatibility-failure', !result.passed);
      }
      report.replaceChildren(table);
    }

    responseSelect.addEventListener('change', showResponse);
    clientSelect.addEventListener('change', () => {
      showResponse();
      if (report.firstChild) showChecks();
    });
    run.addEventListener('click', showChecks);
    showResponse();
  }

  return { mount, runChecks };
})();
