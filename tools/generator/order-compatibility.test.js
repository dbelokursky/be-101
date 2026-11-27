'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'order-compatibility.js'), 'utf8');
const { runChecks } = vm.runInNewContext(source + '\nbe101OrderCompatibility;');

test('старый клиент проходит прежние ответы и падает на новом статусе', () => {
  const results = Array.from(runChecks('1.4'), row => [row.label, row.passed]);
  assert.deepEqual(results, [
    ['API 1.8 · NEW', true],
    ['API 1.8 · CANCELLED', true],
    ['API 1.9 · PAYMENT_PENDING', false],
  ]);
  assert.match(runChecks('1.4')[2].actual, /Ошибка карточки.*PAYMENT_PENDING/);
});

test('новый клиент сохраняет прежние действия и показывает ожидание оплаты', () => {
  const results = Array.from(runChecks('1.5'), row => [row.actual, row.passed]);
  assert.deepEqual(results, [
    ['Новый. Кнопка отмены активна.', true],
    ['Отменён. Кнопка отмены отключена.', true],
    ['Ожидает подтверждения оплаты. Кнопка отмены отключена.', true],
  ]);
});
