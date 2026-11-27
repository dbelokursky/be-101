'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'case-work.js'), 'utf8');

function openCourse(localStorage) {
  return vm.runInNewContext(source + '\nbe101CaseWork;', { localStorage });
}

function storage(values = new Map()) {
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

test('черновики восстанавливаются отдельно для каждого урока и кейса', () => {
  const localStorage = storage();
  const progress = '{"m5-order-timeout":{"caseDone":{"0":true}}}';
  localStorage.setItem('be101.progress.v1', progress);
  const course = openCourse(localStorage);
  assert.equal(course.save('m5-order-timeout', 0, 'answer', 'Первая гипотеза'), true);
  course.save('m5-order-timeout', 1, 'answer', 'Повтор с тем же ключом');
  course.save('m6-order-release', 0, 'answer', 'Проверить версию на стенде');

  const reloaded = openCourse(localStorage);
  assert.deepEqual({ ...reloaded.load('m5-order-timeout', 0, 'answer') }, {
    text: 'Первая гипотеза',
    saved: true,
  });
  assert.equal(reloaded.load('m5-order-timeout', 1, 'answer').text, 'Повтор с тем же ключом');
  assert.equal(reloaded.load('m6-order-release', 0, 'answer').text, 'Проверить версию на стенде');
  assert.equal(localStorage.getItem('be101.progress.v1'), progress);
});

test('правка ответа в одной вкладке сохраняет самооценку из другой', () => {
  const localStorage = storage();
  const first = openCourse(localStorage);
  const second = openCourse(localStorage);

  first.save('course-basic-final', 0, 'answer', 'Ответ');
  second.save('course-basic-final', 0, 'review', 'В ответе есть вывод по данным');
  first.save('course-basic-final', 0, 'answer', '');

  assert.equal(second.load('course-basic-final', 0, 'answer').text, '');
  assert.equal(first.load('course-basic-final', 0, 'review').text, 'В ответе есть вывод по данным');
});

test('при ошибке записи черновик доступен до закрытия страницы', () => {
  const localStorage = storage();
  const course = openCourse({
    getItem: localStorage.getItem,
    setItem() { throw new Error('quota exceeded'); },
  });

  assert.equal(course.save('m5-order-timeout', 0, 'answer', 'Уточнённая гипотеза'), false);
  assert.deepEqual({ ...course.load('m5-order-timeout', 0, 'answer') }, {
    text: 'Уточнённая гипотеза',
    saved: false,
  });
  assert.equal(openCourse(localStorage).load('m5-order-timeout', 0, 'answer').text, '');
});

test('Markdown содержит задание, решение и заполненную самооценку', () => {
  const course = openCourse(storage());
  const lesson = {
    title: 'Таймаут',
    cases: [{ title: 'Повтор запроса', task: 'Обоснуй безопасный повтор', referenceHtml: 'Эталон' }],
  };
  const answer = '    POST /api/bookings\n\nВ БД одна запись.';
  const review = 'Контракт — выполнено. Данные — проверить по ID.';
  const file = course.markdown(lesson, 0, answer, review);

  assert.equal(file, [
    '# Повтор запроса',
    'Урок «Таймаут»',
    '## Задание',
    'Обоснуй безопасный повтор',
    '## Решение',
    answer,
    '## Самооценка по разбору',
    review,
  ].join('\n\n') + '\n');
  assert.doesNotMatch(course.markdown(lesson, 0, answer, '   '), /Самооценка|Эталон/);
});
