'use strict';

const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { expect, test } = require('@playwright/test');

const site = path.resolve(__dirname, '../../../site');
let server;
let courseUrl;

test.beforeAll(async () => {
  const files = new Map([
    ['/be-101/', ['index.html', 'text/html; charset=utf-8']],
    ['/be-101/order-worker.js', ['order-worker.js', 'text/javascript; charset=utf-8']],
    ['/be-101/mermaid.min.js', ['mermaid.min.js', 'text/javascript; charset=utf-8']],
  ].map(([url, [file, type]]) => [url, { body: readFileSync(path.join(site, file)), type }]));

  server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const file = files.get(url.pathname);
    if (!file) return response.writeHead(404).end();
    response.writeHead(200, { 'Content-Type': file.type }).end(file.body);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  courseUrl = 'http://127.0.0.1:' + server.address().port + '/be-101/';
});

test.afterAll(async () => {
  if (!server?.listening) return;
  server.close();
  await once(server, 'close');
});

test('навигация по HTTP, результат квиза и прогресс после перезагрузки', async ({ page }) => {
  await page.goto(courseUrl);
  const sidebar = page.locator('.sidebar');
  await expect(sidebar.getByRole('button', { name: 'Базовый маршрут', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');

  await sidebar.getByRole('link', { name: 'Расследование 504 при отмене заказа', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Расследование 504 при отмене заказа', level: 1 }))
    .toBeVisible();
  await page.getByRole('button', {
    name: 'Транзакция откатилась. В срезе заказ ещё NEW, возврата по отмене нет',
    exact: true,
  }).click();
  await expect(page.getByText(/Квиз сдан!.*верно 1 из 1/)).toBeVisible();

  await page.reload();
  await expect(page.getByText('✓ уже сдан', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Следующий → Проверка релиза на стенде', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Проверка релиза на стенде', level: 1 })).toBeVisible();

  const full = sidebar.getByRole('button', { name: 'Полный курс и Spring', exact: true });
  await full.click();
  await expect(full).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Проверка релиза на стенде', level: 1 })).toBeVisible();
});

test('открытие с диска, локальный GET и сохранение кейса', async ({ page }) => {
  const entry = pathToFileURL(path.join(site, 'index.html')).href;
  await page.goto(entry + '#/m1-api-access');
  await page.getByRole('button', { name: 'Отправить GET', exact: true }).click();
  const response = page.locator('.order-exercise').getByRole('status');
  await expect(response).toContainText('200 OK');
  await expect(response).toContainText('Локальная учебная модель');

  await page.getByRole('link', { name: 'Проверка релиза на стенде', exact: true }).click();
  const exercise = page.locator('.case').filter({ hasText: 'Проверь выкладку и подготовь решение об откате' });
  const answer = exercise.getByRole('textbox', { name: /Решение кейса/ });
  const draft = 'Сверю версию стенда, статус миграции и чтение отменённого заказа.';
  await answer.fill(draft);
  await exercise.getByRole('button', { name: 'Показать эталонный разбор', exact: true }).click();
  await expect(exercise.getByText('✓ разобран', { exact: true })).toBeVisible();

  await page.reload();
  await expect(answer).toHaveValue(draft);
  await expect(exercise.getByText('✓ разобран', { exact: true })).toBeVisible();
});
