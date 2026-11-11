/* BE-101 course engine: роутинг, прогресс, квиз-движок. Ванильный JS, без зависимостей. */
(function () {
  'use strict';

  var LESSONS = (window.BE101 && window.BE101.lessons) || [];
  var STORE_KEY = 'be101.progress.v1';
  var PASS_RATIO = 0.8; // порог сдачи квиза: 80%+

  // ---------- утилиты ----------

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function normalizeText(s) {
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // ---------- прогресс (localStorage) ----------
  // { lessonId: { quizPassed: {slotIndex: true}, labDone: bool } }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var p = raw ? JSON.parse(raw) : {};
      return p && typeof p === 'object' ? p : {};
    } catch (_) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (_) {}
  }
  function getLessonProgress(id) {
    var p = loadProgress();
    var lp = p[id];
    if (!lp || typeof lp !== 'object') lp = { quizPassed: {}, caseDone: {}, labDone: false };
    if (!lp.quizPassed) lp.quizPassed = {};
    if (!lp.caseDone) lp.caseDone = {};
    return lp;
  }
  function setQuizPassed(lessonId, slot, passed) {
    var p = loadProgress();
    if (!p[lessonId]) p[lessonId] = { quizPassed: {}, caseDone: {}, labDone: false };
    if (!p[lessonId].quizPassed) p[lessonId].quizPassed = {};
    p[lessonId].quizPassed[slot] = passed;
    saveProgress(p);
  }
  function setCaseDone(lessonId, slot, done) {
    var p = loadProgress();
    if (!p[lessonId]) p[lessonId] = { quizPassed: {}, caseDone: {}, labDone: false };
    if (!p[lessonId].caseDone) p[lessonId].caseDone = {};
    p[lessonId].caseDone[slot] = done;
    saveProgress(p);
  }
  function setLabDone(lessonId, done) {
    var p = loadProgress();
    if (!p[lessonId]) p[lessonId] = { quizPassed: {}, caseDone: {}, labDone: false };
    p[lessonId].labDone = done;
    saveProgress(p);
  }

  function lessonUnits(l) { return l.quizzes.length + l.cases.length + (l.lab ? 1 : 0); }
  function lessonDoneUnits(l) {
    var lp = getLessonProgress(l.id);
    var q = 0, i;
    for (i = 0; i < l.quizzes.length; i++) if (lp.quizPassed[i]) q++;
    for (i = 0; i < l.cases.length; i++) if (lp.caseDone[i]) q++;
    return q + (l.lab && lp.labDone ? 1 : 0);
  }
  function moduleProgress() {
    var done = 0, total = 0;
    for (var i = 0; i < LESSONS.length; i++) {
      done += lessonDoneUnits(LESSONS[i]);
      total += lessonUnits(LESSONS[i]);
    }
    return total ? done / total : 0;
  }

  // ---------- роутинг ----------

  function currentLessonId() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    for (var i = 0; i < LESSONS.length; i++) {
      if (LESSONS[i].id === h) return h;
    }
    return LESSONS.length ? LESSONS[0].id : '';
  }

  // ---------- сайдбар ----------

  function renderSidebar(container, activeId) {
    var wrap = el('aside', 'sidebar');

    var brand = el('div', 'brand');
    brand.appendChild(el('div', 'brand-title', 'BE‑101'));
    brand.appendChild(el('div', 'brand-sub', 'Бэкенд для смежных специальностей'));
    wrap.appendChild(brand);

    var progWrap = el('div', 'module-progress');
    var pct = Math.round(moduleProgress() * 100);
    progWrap.appendChild(el('div', 'module-progress-label',
      'Прогресс модуля: <b>' + pct + '%</b>'));
    var bar = el('div', 'module-progress-bar');
    var fill = el('div', 'module-progress-fill');
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    progWrap.appendChild(bar);
    wrap.appendChild(progWrap);

    var list = el('nav', 'lesson-list');
    LESSONS.forEach(function (l) {
      var done = lessonUnits(l) > 0 && lessonDoneUnits(l) === lessonUnits(l);
      var item = el('a',
        'lesson-item' + (l.id === activeId ? ' active' : ''),
        '<span class="lesson-status ' + (done ? 'done' : '') + '">' + (done ? '✓' : '') + '</span>' +
        '<span class="lesson-title">' + esc(l.order + '. ' + l.title) + '</span>');
      item.href = '#/' + l.id;
      list.appendChild(item);
    });
    wrap.appendChild(list);

    var footer = el('div', 'sidebar-footer',
      'Прогресс хранится только в твоём браузере');
    wrap.appendChild(footer);

    container.appendChild(wrap);
  }

  // обновить только сайдбар (галочки/прогресс), не трогая контент урока:
  // полный render() пересоздал бы DOM и сбрасывал незакрытую попытку квиза
  function updateSidebar(activeId) {
    var appEl = document.getElementById('app');
    var old = appEl && appEl.querySelector('.sidebar');
    if (!old) return;
    var holder = el('div');
    renderSidebar(holder, activeId || currentLessonId());
    old.parentNode.replaceChild(holder.firstChild, old);
  }

  // ---------- квиз-движок ----------

  var TYPE_LABELS = {
    single: 'один ответ',
    multi: 'несколько ответов',
    blank: 'впиши ответ',
    match: 'сопоставь',
  };

  function mountQuiz(slotEl, lesson, slotIndex) {
    var questions = lesson.quizzes[slotIndex];
    var lp = getLessonProgress(lesson.id);
    var alreadyPassed = !!lp.quizPassed[slotIndex];

    var root = el('div', 'quiz');
    root.appendChild(el('div', 'quiz-head',
      '<span class="quiz-badge">Квиз</span>' +
      '<span class="quiz-hint">Порог сдачи — ' + Math.round(PASS_RATIO * 100) + '%. Пересдача не ограничена.</span>' +
      (alreadyPassed ? '<span class="quiz-passed-badge">✓ уже сдан</span>' : '')));

    var body = el('div', 'quiz-body');
    root.appendChild(body);

    var result = el('div', 'quiz-result');
    root.appendChild(result);

    var order; // порядок вопросов текущей попытки

    function startAttempt() {
      body.innerHTML = '';
      result.innerHTML = '';
      result.className = 'quiz-result';
      order = shuffle(questions.map(function (_, i) { return i; }));
      var correctCount = 0;
      var answeredCount = 0;

      order.forEach(function (qi, pos) {
        var q = questions[qi];
        var qEl = el('div', 'question');
        qEl.appendChild(el('div', 'question-head',
          '<span class="question-num">' + (pos + 1) + '</span>' +
          '<span class="question-type">' + TYPE_LABELS[q.type] + '</span>'));
        qEl.appendChild(el('div', 'question-text', esc(q.question)));
        if (q.codeHtml) {
          qEl.appendChild(el('pre', 'question-code', '<code>' + q.codeHtml + '</code>'));
        }
        var area = el('div', 'question-area');
        qEl.appendChild(area);

        function finish(ok, detailsHtml) {
          correctCount += ok ? 1 : 0;
          answeredCount++;
          qEl.classList.add(ok ? 'ok' : 'fail');
          area.classList.add('locked');
          var fb = el('div', 'question-feedback ' + (ok ? 'ok' : 'fail'),
            '<b>' + (ok ? '✓ Верно' : '✗ Неверно') + '</b>' +
            (q.explanation ? '<div class="question-expl">' + esc(q.explanation) + '</div>' : '') +
            (detailsHtml || ''));
          qEl.appendChild(fb);
          if (answeredCount === questions.length) finishAttempt(correctCount);
        }

        if (q.type === 'single') {
          q.options.forEach(function (opt, oi) {
            var b = el('button', 'option', esc(opt));
            b.type = 'button';
            b.addEventListener('click', function () {
              if (area.classList.contains('locked')) return;
              var ok = oi === q.correct;
              area.querySelectorAll('.option').forEach(function (o, idx) {
                o.disabled = true;
                if (idx === q.correct) o.classList.add('correct');
              });
              if (!ok) b.classList.add('wrong');
              finish(ok);
            });
            area.appendChild(b);
          });
        }

        if (q.type === 'multi') {
          var boxes = [];
          q.options.forEach(function (opt, oi) {
            var lab = el('label', 'option check',
              '<input type="checkbox" data-i="' + oi + '"> <span>' + esc(opt) + '</span>');
            area.appendChild(lab);
            boxes.push(lab);
          });
          var submit = el('button', 'btn small', 'Ответить');
          submit.type = 'button';
          submit.addEventListener('click', function () {
            if (area.classList.contains('locked')) return;
            var chosen = [];
            boxes.forEach(function (l) {
              var cb = l.querySelector('input');
              if (cb.checked) chosen.push(Number(cb.dataset.i));
            });
            if (!chosen.length) return;
            var need = q.correct.slice().sort(function (a, b) { return a - b; });
            var got = chosen.slice().sort(function (a, b) { return a - b; });
            var ok = need.length === got.length && need.every(function (v, i) { return v === got[i]; });
            boxes.forEach(function (l) {
              var cb = l.querySelector('input');
              cb.disabled = true;
              var i = Number(cb.dataset.i);
              if (need.indexOf(i) >= 0) l.classList.add('correct');
              else if (cb.checked) l.classList.add('wrong');
            });
            finish(ok);
          });
          area.appendChild(submit);
        }

        if (q.type === 'blank') {
          var row = el('div', 'blank-row');
          var input = document.createElement('input');
          input.type = 'text';
          input.className = 'blank-input';
          input.placeholder = 'Твой ответ…';
          input.autocomplete = 'off';
          input.spellcheck = false;
          var b = el('button', 'btn small', 'Ответить');
          b.type = 'button';
          row.appendChild(input);
          row.appendChild(b);
          area.appendChild(row);
          function submitBlank() {
            if (area.classList.contains('locked')) return;
            var v = normalizeText(input.value);
            if (!v) return;
            var ok = q.answers.some(function (a) { return normalizeText(a) === v; });
            input.disabled = true;
            b.disabled = true;
            input.classList.add(ok ? 'correct' : 'wrong');
            finish(ok, ok ? '' : '<div class="correct-answer">Правильный ответ: <b>' +
              esc(q.answers[0]) + '</b></div>');
          }
          b.addEventListener('click', submitBlank);
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitBlank();
          });
        }

        if (q.type === 'match') {
          var rights = shuffle(q.pairs.map(function (p) { return p.right; }));
          var selects = [];
          q.pairs.forEach(function (p) {
            var rowM = el('div', 'match-row');
            rowM.appendChild(el('div', 'match-left', esc(p.left)));
            var sel = document.createElement('select');
            sel.className = 'match-select';
            sel.appendChild(el('option', '', '— выбери —'));
            rights.forEach(function (r) {
              var o = el('option', '', esc(r));
              o.value = r;
              sel.appendChild(o);
            });
            rowM.appendChild(sel);
            area.appendChild(rowM);
            selects.push({ select: sel, right: p.right });
          });
          var submitM = el('button', 'btn small', 'Ответить');
          submitM.type = 'button';
          submitM.addEventListener('click', function () {
            if (area.classList.contains('locked')) return;
            if (selects.some(function (s) { return !s.select.value; })) return;
            var allOk = true;
            selects.forEach(function (s) {
              s.select.disabled = true;
              var ok = s.select.value === s.right;
              if (!ok) allOk = false;
              s.select.classList.add(ok ? 'correct' : 'wrong');
            });
            finish(allOk);
          });
          area.appendChild(submitM);
        }

        body.appendChild(qEl);
      });
    }

    function finishAttempt(correctCount) {
      var pct = Math.round((correctCount / questions.length) * 100);
      var passed = correctCount / questions.length >= PASS_RATIO;
      setQuizPassed(lesson.id, slotIndex, passed || getLessonProgress(lesson.id).quizPassed[slotIndex]);

      result.className = 'quiz-result show ' + (passed ? 'ok' : 'fail');
      result.innerHTML =
        '<div class="quiz-score">' +
        (passed ? '🎉 Квиз сдан!' : 'Пока не сдан') +
        ' — верно ' + correctCount + ' из ' + questions.length +
        ' (' + pct + '%)' +
        '</div>' +
        (passed
          ? '<div class="quiz-note">Урок отмечен пройденным ✓</div>'
          : '<div class="quiz-note">Нужно ' + Math.round(PASS_RATIO * 100) +
            '%+. Перечитай пояснения выше и попробуй ещё раз — вопросы перемешаются.</div>');

      var retake = el('button', 'btn small', 'Пройти заново');
      retake.type = 'button';
      retake.addEventListener('click', function () {
        startAttempt();
      });
      result.appendChild(retake);
      updateSidebar();
    }

    slotEl.innerHTML = '';
    slotEl.appendChild(root);
    startAttempt();
  }

  // ---------- кейс (textarea + эталонный разбор) ----------

  function mountCase(slotEl, lesson, caseIndex) {
    var c = lesson.cases[caseIndex];
    var lp = getLessonProgress(lesson.id);
    var done = !!lp.caseDone[caseIndex];

    var root = el('div', 'case');
    root.appendChild(el('div', 'case-head',
      '<span class="case-badge">Кейс</span>' +
      '<span class="case-title">' + esc(c.title) + '</span>' +
      (done ? '<span class="case-done-badge">✓ разобран</span>' : '')));
    root.appendChild(el('div', 'case-task', esc(c.task)));

    var area = document.createElement('textarea');
    area.className = 'case-input';
    area.placeholder = c.placeholder || 'Свой ответ…';
    area.spellcheck = false;
    root.appendChild(area);

    var btn = el('button', 'btn small', 'Показать эталонный разбор');
    btn.type = 'button';
    btn.disabled = true;
    area.addEventListener('input', function () {
      btn.disabled = !area.value.trim();
    });
    root.appendChild(btn);

    var ref = el('div', 'case-reference' + (done ? ' show' : ''), c.referenceHtml);
    root.appendChild(ref);

    var note = el('div', 'case-note',
      'Эталон — для самопроверки: сначала своё решение, потом сверка. Ответ никуда не отправляется.');
    root.appendChild(note);

    btn.addEventListener('click', function () {
      if (!area.value.trim()) return;
      setCaseDone(lesson.id, caseIndex, true);
      ref.classList.add('show');
      root.querySelector('.case-head').appendChild(
        el('span', 'case-done-badge', '✓ разобран'));
      btn.disabled = true;
      updateSidebar();
    });

    slotEl.innerHTML = '';
    slotEl.appendChild(root);
  }

  // ---------- карточка лабы ----------

  function mountLab(article, lesson) {
    var lab = lesson.lab;
    if (!lab) return;
    var card = el('div', 'lab-card');
    card.appendChild(el('div', 'lab-head', '<span class="lab-badge">Лабораторная</span> ' + esc(lab.title)));
    if (lab.description) card.appendChild(el('p', 'lab-desc', esc(lab.description)));
    if (lab.branch) {
      card.appendChild(el('div', 'lab-branches',
        'Ветка задания: <code>' + esc(lab.branch) + '</code>' +
        (lab.branchSolution ? ' · решение: <code>' + esc(lab.branchSolution) + '</code>' : '') +
        (lab.hasTests
          ? ' · проверка: <code>' + esc(lab.testCommand || 'mvn test') + '</code>'
          : (lab.branchSolution ? ' · сверяешься с решением' : ''))
      ));
    }
    var lp = getLessonProgress(lesson.id);
    var label = el('label', 'lab-check',
      '<input type="checkbox"' + (lp.labDone ? ' checked' : '') + '> Я сделал эту лабу');
    label.querySelector('input').addEventListener('change', function (e) {
      setLabDone(lesson.id, e.target.checked);
      updateSidebar(); // только галочки/прогресс, без сброса квиза
    });
    card.appendChild(label);
    article.appendChild(card);
  }

  // ---------- страница ----------

  var app;

  function render() {
    if (!app) app = document.getElementById('app');
    var id = currentLessonId();
    var lesson = LESSONS.filter(function (l) { return l.id === id; })[0];

    app.innerHTML = '';
    if (!lesson) {
      app.appendChild(el('div', 'empty', 'Уроки не найдены — запусти сборку (tools/generator)'));
      return;
    }

    renderSidebar(app, lesson.id);

    var main = el('main', 'content');
    var article = el('article', 'lesson');
    article.innerHTML = lesson.html;
    main.appendChild(article);
    app.appendChild(main);

    // лаба — в конец урока
    mountLab(article, lesson);

    // монтируем квизы и кейсы в слоты из markdown
    article.querySelectorAll('.quiz-slot').forEach(function (slot) {
      var idx = Number(slot.dataset.quiz);
      if (lesson.quizzes[idx]) mountQuiz(slot, lesson, idx);
    });
    article.querySelectorAll('.case-slot').forEach(function (slot) {
      var idx = Number(slot.dataset.case);
      if (lesson.cases[idx]) mountCase(slot, lesson, idx);
    });

    // mermaid-диаграммы
    if (window.mermaid) {
      try {
        window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', locale: 'ru' });
        var nodes = article.querySelectorAll('.mermaid');
        if (nodes.length) window.mermaid.run({ nodes: nodes });
      } catch (_) { /* диаграммы не критичны */ }
    }

    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})();
