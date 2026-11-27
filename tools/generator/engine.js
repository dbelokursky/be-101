/* BE-101 course engine: роутинг, прогресс, квиз-движок. Ванильный JS, без зависимостей. */
(function () {
  'use strict';

  var LESSONS = (window.BE101 && window.BE101.lessons) || [];
  var BASIC_LESSONS = LESSONS.filter(function (lesson) { return lesson.baseOrder > 0; })
    .sort(function (left, right) { return left.baseOrder - right.baseOrder; });
  var STORE_KEY = 'be101.progress.v1';
  var ROUTE_KEY = 'be101.route';
  var THEME_KEY = 'be101.theme';
  var PASS_RATIO = 0.8; // порог сдачи квиза: 80%+
  var LAB_REPO = 'https://github.com/dbelokursky/be-101';
  var currentRoute = loadRoute();
  rememberRoute(currentRoute);

  // ---------- тема (светлая/тёмная) ----------

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* приватный режим */ }
  }
  (function initTheme() {
    var t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (_) { /* ignore */ }
    if (!t) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  })();

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
  function shuffledIndices(items) {
    return shuffle(items.map(function (_, index) { return index; }));
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

  function lessonUnits(l, includeLabs = true) {
    return l.quizzes.length + l.cases.length + (includeLabs && l.lab ? 1 : 0);
  }
  function lessonDoneUnits(l, includeLabs = true) {
    var lp = getLessonProgress(l.id);
    var q = 0, i;
    for (i = 0; i < l.quizzes.length; i++) if (lp.quizPassed[i]) q++;
    for (i = 0; i < l.cases.length; i++) if (lp.caseDone[i]) q++;
    return q + (includeLabs && l.lab && lp.labDone ? 1 : 0);
  }
  function moduleProgress() {
    var done = 0, total = 0;
    for (var i = 0; i < LESSONS.length; i++) {
      done += lessonDoneUnits(LESSONS[i]);
      total += lessonUnits(LESSONS[i]);
    }
    return total ? done / total : 0;
  }
  // moduleProgress оставлен для будущих сводных экранов; сайдбар считает прогресс по каждому модулю отдельно

  // ---------- роутинг ----------

  function currentLessonId() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    for (var i = 0; i < LESSONS.length; i++) {
      if (LESSONS[i].id === h) return h;
    }
    return LESSONS.length ? LESSONS[0].id : '';
  }

  function loadRoute() {
    try {
      var saved = localStorage.getItem(ROUTE_KEY);
      if (saved === 'basic' || saved === 'full') return saved;
    } catch (_) { /* приватный режим */ }
    return Object.keys(loadProgress()).length ? 'full' : 'basic';
  }

  function rememberRoute(route) {
    currentRoute = route;
    try { localStorage.setItem(ROUTE_KEY, route); } catch (_) { /* приватный режим */ }
  }

  function isBasicRoute() { return currentRoute === 'basic' && BASIC_LESSONS.length > 0; }
  function routeLessons() { return isBasicRoute() ? BASIC_LESSONS : LESSONS; }

  function nextIncompleteLesson() {
    var includeLabs = !isBasicRoute();
    return routeLessons().find(function (lesson) {
      return lessonDoneUnits(lesson, includeLabs) < lessonUnits(lesson, includeLabs);
    });
  }

  function lessonLabel(lesson) {
    return Number.isInteger(lesson.order) ? lesson.order + '. ' + lesson.title : lesson.title;
  }

  function selectRoute(route) {
    if (currentRoute === route) return;
    rememberRoute(route);
    var lessons = routeLessons();
    var active = currentLessonId();
    if (active === 'course-trainer' || lessons.some(function (lesson) { return lesson.id === active; })) {
      render();
      return;
    }
    var next = nextIncompleteLesson() || lessons[0];
    location.hash = '#/' + next.id;
  }

  function routeChoices(withDescription) {
    var choices = el('div', withDescription ? 'route-choices' : 'route-switch');
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Маршрут курса');
    [
      ['basic', 'Базовый маршрут', 'Проверь API заказа, расследуй таймаут и оцени релиз на стенде.'],
      ['full', 'Полный курс и Spring', 'Пройди все модули и собери сервис на Java в лабораторных.'],
    ].forEach(function (entry) {
      var route = entry[0];
      var button = el('button', 'route-option');
      button.type = 'button';
      button.setAttribute('aria-pressed', String((isBasicRoute() ? 'basic' : 'full') === route));
      button.appendChild(el('span', 'route-option-label', entry[1]));
      if (withDescription) button.appendChild(el('span', 'route-option-description', entry[2]));
      button.addEventListener('click', function () { selectRoute(route); });
      choices.appendChild(button);
    });
    return choices;
  }

  function updateContinueLink() {
    var link = document.querySelector('.continue-banner');
    if (!link) return;
    var next = nextIncompleteLesson();
    link.hidden = !next || next.id === currentLessonId();
    if (link.hidden) return;
    link.href = '#/' + next.id;
    link.textContent = 'Продолжить с урока «' + next.title + '»';
  }

  function mountRouteIntro(article) {
    var intro = el('section', 'route-intro');
    intro.appendChild(routeChoices(true));
    intro.appendChild(el('a', 'continue-banner'));
    article.insertBefore(intro, article.firstChild);
    updateContinueLink();
  }

  // ---------- сайдбар ----------

  function renderSidebar(container, activeId) {
    var wrap = el('aside', 'sidebar');

    var brand = el('div', 'brand');
    var brandRow = el('div', 'brand-row');
    brandRow.appendChild(el('div', 'brand-title', 'BE‑101'));
    var themeBtn = el('button', 'theme-toggle', currentTheme() === 'dark' ? '☀️' : '🌙');
    themeBtn.type = 'button';
    themeBtn.title = 'Переключить тему';
    themeBtn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      render(); // перекрасить mermaid и иконку
    });
    brandRow.appendChild(themeBtn);
    brand.appendChild(brandRow);
    brand.appendChild(el('div', 'brand-sub', 'Бэкенд для смежных специальностей'));
    wrap.appendChild(brand);
    if (BASIC_LESSONS.length) wrap.appendChild(routeChoices(false));

    // группировка уроков по модулям (module — номер, moduleTitle — название)
    var includeLabs = !isBasicRoute();
    var modules = [];
    var byNum = {};
    routeLessons().forEach(function (l) {
      var group = includeLabs ? l.module : 'basic';
      if (!byNum[group]) {
        byNum[group] = {
          title: includeLabs ? (l.moduleTitle || 'Модуль ' + l.module) : 'Сценарий с заказом',
          lessons: [],
        };
        modules.push(byNum[group]);
      }
      byNum[group].lessons.push(l);
    });

    modules.forEach(function (m) {
      var done = 0, total = 0;
      m.lessons.forEach(function (l) {
        done += lessonDoneUnits(l, includeLabs);
        total += lessonUnits(l, includeLabs);
      });
      var pct = total ? Math.round((done / total) * 100) : 0;

      var head = el('div', 'module-head');
      head.appendChild(el('div', 'module-title', esc(m.title)));
      head.appendChild(el('div', 'module-progress-label', pct + '%'));
      wrap.appendChild(head);

      var bar = el('div', 'module-progress-bar');
      var fill = el('div', 'module-progress-fill');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      wrap.appendChild(bar);

      var list = el('nav', 'lesson-list');
      m.lessons.forEach(function (l) {
        var units = lessonUnits(l, includeLabs);
        var lessonDone = units > 0 && lessonDoneUnits(l, includeLabs) === units;
        var item = el('a',
          'lesson-item' + (l.id === activeId ? ' active' : ''),
          '<span class="lesson-status ' + (lessonDone ? 'done' : '') + '">' + (lessonDone ? '✓' : '') + '</span>' +
          '<span class="lesson-title">' + esc(includeLabs ? lessonLabel(l) : l.title) + '</span>');
        item.href = '#/' + l.id;
        list.appendChild(item);
      });
      wrap.appendChild(list);
    });

    if (isBasicRoute() && LESSONS.some(function (lesson) { return lesson.id === 'course-trainer'; })) {
      var trainerLink = el('a', 'lesson-item route-trainer' +
        (activeId === 'course-trainer' ? ' active' : ''), 'Тренажёр повторения');
      trainerLink.href = '#/course-trainer';
      wrap.appendChild(trainerLink);
    }

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
    updateContinueLink();
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
      order = shuffledIndices(questions);
      var correctCount = 0;
      var answeredCount = 0;
      var okByIndex = {};

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
          okByIndex[qi] = ok;
          answeredCount++;
          qEl.classList.add(ok ? 'ok' : 'fail');
          area.classList.add('locked');
          var fb = el('div', 'question-feedback ' + (ok ? 'ok' : 'fail'),
            '<b>' + (ok ? '✓ Верно' : '✗ Неверно') + '</b>' +
            (q.explanation ? '<div class="question-expl">' + esc(q.explanation) + '</div>' : '') +
            (detailsHtml || ''));
          qEl.appendChild(fb);
          if (answeredCount === questions.length) finishAttempt(correctCount, okByIndex);
        }

        if (q.type === 'single') {
          var optionOrder = shuffledIndices(q.options);
          optionOrder.forEach(function (oi) {
            var b = el('button', 'option', esc(q.options[oi]));
            b.type = 'button';
            b.addEventListener('click', function () {
              if (area.classList.contains('locked')) return;
              var ok = oi === q.correct;
              area.querySelectorAll('.option').forEach(function (o, idx) {
                o.disabled = true;
                if (optionOrder[idx] === q.correct) o.classList.add('correct');
              });
              if (!ok) b.classList.add('wrong');
              finish(ok);
            });
            area.appendChild(b);
          });
        }

        if (q.type === 'multi') {
          var boxes = [];
          shuffledIndices(q.options).forEach(function (oi) {
            var lab = el('label', 'option check',
              '<input type="checkbox" data-i="' + oi + '"> <span>' + esc(q.options[oi]) + '</span>');
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

    function finishAttempt(correctCount, okByIndex) {
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
            '%+. Перечитай пояснения выше и попробуй ещё раз — вопросы и варианты перемешаются.</div>');

      // «что перечитать»: темы проваленных вопросов (кроме собственных уроков)
      var wrongTopics = {};
      questions.forEach(function (q, qi) {
        if (!okByIndex[qi] && q.topic && q.topic !== lesson.id) wrongTopics[q.topic] = true;
      });
      var topicIds = Object.keys(wrongTopics);
      if (topicIds.length) {
        var links = [];
        topicIds.forEach(function (tid) {
          for (var i = 0; i < LESSONS.length; i++) {
            if (LESSONS[i].id === tid) {
              links.push('<a href="#/' + tid + '">' +
                esc(lessonLabel(LESSONS[i])) + '</a>');
              break;
            }
          }
        });
        if (links.length) {
          result.appendChild(el('div', 'quiz-review',
            '📖 Перечитать: ' + links.join(' · ')));
        }
      }

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

  // ---------- навигация ←/→ и спец-страницы ----------

  function navLink(lesson, dir) {
    var a = el('a', 'lesson-nav-link ' + dir);
    a.href = '#/' + lesson.id;
    a.appendChild(el('span', 'lesson-nav-label',
      dir === 'prev' ? '← Предыдущий' : 'Следующий →'));
    a.appendChild(el('span', 'lesson-nav-title', esc(lesson.title)));
    return a;
  }

  function appendLessonNav(article, lesson) {
    var lessons = routeLessons();
    var idx = lessons.indexOf(lesson);
    if (idx < 0) return;
    var nav = el('div', 'lesson-nav');
    nav.appendChild(idx > 0 ? navLink(lessons[idx - 1], 'prev')
                            : el('span', 'lesson-nav-spacer'));
    nav.appendChild(idx < lessons.length - 1 ? navLink(lessons[idx + 1], 'next')
                                             : el('span', 'lesson-nav-spacer'));
    article.appendChild(nav);
  }

  // финальный экран: сводный прогресс по всем модулям (динамическая шапка)
  function mountFinishHero(article) {
    var hero = el('div', 'finish-hero');

    var total = 0, done = 0;
    var modules = [];
    var byNum = {};
    LESSONS.forEach(function (l) {
      if (!byNum[l.module]) {
        byNum[l.module] = { title: l.moduleTitle || ('Модуль ' + l.module), lessons: [] };
        modules.push(byNum[l.module]);
      }
      byNum[l.module].lessons.push(l);
      total += lessonUnits(l);
      done += lessonDoneUnits(l);
    });
    var pct = total ? Math.round((done / total) * 100) : 0;

    hero.appendChild(el('div', 'finish-emoji', pct >= 100 ? '🏆' : '🎓'));
    hero.appendChild(el('div', 'finish-heading',
      pct >= 100 ? 'Курс пройден полностью!' : 'Твой прогресс по курсу'));
    hero.appendChild(el('div', 'finish-subline',
      'Пройдено <b>' + done + '</b> из <b>' + total + '</b> юнитов (' + pct + '%)' +
      (pct >= 100 ? '' : ' — возвращайся к незакрытым квизам, лабам и кейсам')));

    var rows = el('div', 'finish-rows');
    modules.forEach(function (m) {
      var t = 0, d = 0;
      m.lessons.forEach(function (l) { t += lessonUnits(l); d += lessonDoneUnits(l); });
      var p = t ? Math.round((d / t) * 100) : 0;
      var row = el('div', 'finish-row');
      row.appendChild(el('div', 'finish-row-title', esc(m.title)));
      var bar = el('div', 'module-progress-bar');
      var fill = el('div', 'module-progress-fill');
      fill.style.width = p + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'finish-row-pct', p + '%'));
      rows.appendChild(row);
    });
    hero.appendChild(rows);
    article.insertBefore(hero, article.firstChild);
  }

  function collectQuestions(lessons) {
    return lessons.flatMap(function (lesson) { return lesson.quizzes.flat(); });
  }

  // тренажёр выбирает вопросы внутри активного маршрута
  function mountTrainer(article) {
    var wrap = el('div', 'trainer');
    var btn = el('button', 'btn', 'Собрать сет из 10 вопросов');
    btn.type = 'button';
    wrap.appendChild(btn);
    var note = el('div', 'trainer-note',
      'Вопросы из сданных квизов идут в набор первыми. Остальные берём из выбранного маршрута.');
    wrap.appendChild(note);
    var holder = el('div', 'trainer-holder');
    wrap.appendChild(holder);
    article.appendChild(wrap);

    btn.addEventListener('click', function () {
      var available = routeLessons();
      var passed = available.filter(function (l) {
        var lp = getLessonProgress(l.id);
        for (var i = 0; i < l.quizzes.length; i++) {
          if (lp.quizPassed[i]) return true;
        }
        return false;
      });
      var picked = shuffle(collectQuestions(passed)).slice(0, 10);
      if (picked.length < 10) {
        var remaining = available.filter(function (l) { return !passed.includes(l); });
        picked = picked.concat(shuffle(collectQuestions(remaining)).slice(0, 10 - picked.length));
      }
      holder.innerHTML = '';
      mountQuiz(holder, {
        id: 'trainer-session',
        title: 'Тренажёр',
        module: 0,
        moduleTitle: null,
        order: 0,
        lab: null,
        html: '',
        quizzes: [picked],
        cases: [],
      }, 0);
      holder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------- кейс (решение + эталонный разбор) ----------

  function mountCase(slotEl, lesson, caseIndex) {
    var c = lesson.cases[caseIndex];
    var lp = getLessonProgress(lesson.id);
    var done = !!lp.caseDone[caseIndex];
    var answerDraft = be101CaseWork.load(lesson.id, caseIndex, 'answer');
    var reviewDraft = be101CaseWork.load(lesson.id, caseIndex, 'review');
    var answerSaved = answerDraft.saved;
    var reviewSaved = reviewDraft.saved;

    var root = el('div', 'case');
    var head = el('div', 'case-head',
      '<span class="case-badge">Кейс</span>' +
      '<span class="case-title">' + esc(c.title) + '</span>');
    var badge = el('span', 'case-done-badge', '✓ разобран');
    head.appendChild(badge);
    root.appendChild(head);
    root.appendChild(el('div', 'case-task', esc(c.task)));

    var answer = el('textarea', 'case-input');
    answer.setAttribute('aria-label', 'Решение кейса «' + c.title + '»');
    answer.placeholder = c.placeholder || 'Свой ответ…';
    answer.spellcheck = false;
    answer.value = answerDraft.text;
    root.appendChild(answer);

    var actions = el('div', 'case-actions');
    var toggle = el('button', 'btn small');
    toggle.type = 'button';
    var download = el('button', 'btn small case-download', 'Скачать решение (.md)');
    download.type = 'button';
    actions.append(toggle, download);
    root.appendChild(actions);

    var note = el('p', 'case-note');
    note.setAttribute('role', 'status');
    root.appendChild(note);

    var ref = el('div', 'case-reference', c.referenceHtml);
    ref.id = 'case-reference-' + lesson.id + '-' + caseIndex;
    toggle.setAttribute('aria-controls', ref.id);
    var reviewLabel = el('label', 'case-review', 'Самооценка по разбору');
    var review = el('textarea', 'case-input');
    review.placeholder = 'Какие критерии выполнены? Что стоит доработать?';
    review.value = reviewDraft.text;
    reviewLabel.appendChild(review);
    ref.appendChild(reviewLabel);
    root.appendChild(ref);

    function updateStorageNote() {
      var message = answerSaved && reviewSaved
        ? 'Черновик и самооценка сохраняются в этом браузере.'
        : 'Сохранение в браузере недоступно. Скачай решение перед закрытием страницы.';
      if (note.textContent !== message) note.textContent = message;
    }

    function updateButtons() {
      var hasAnswer = !!answer.value.trim();
      toggle.disabled = !done && !hasAnswer;
      download.disabled = !hasAnswer;
    }

    function updateReview() {
      badge.hidden = !done;
      ref.classList.toggle('show', done);
      toggle.textContent = done ? 'Скрыть эталон' : 'Показать эталонный разбор';
      toggle.setAttribute('aria-expanded', String(done));
      updateButtons();
    }

    answer.addEventListener('input', function () {
      answerSaved = be101CaseWork.save(lesson.id, caseIndex, 'answer', answer.value);
      updateButtons();
      updateStorageNote();
    });
    review.addEventListener('input', function () {
      reviewSaved = be101CaseWork.save(lesson.id, caseIndex, 'review', review.value);
      updateStorageNote();
    });

    toggle.addEventListener('click', function () {
      done = !done;
      setCaseDone(lesson.id, caseIndex, done);
      updateReview();
      updateSidebar();
    });

    download.addEventListener('click', function () {
      var markdown = be101CaseWork.markdown(lesson, caseIndex, answer.value, review.value);
      var url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
      var link = el('a');
      link.href = url;
      link.download = 'be101-' + lesson.id + '-case-' + (caseIndex + 1) + '.md';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    updateStorageNote();
    updateReview();
    slotEl.innerHTML = '';
    slotEl.appendChild(root);
  }

  // ---------- карточка лабы ----------

  function mountLab(article, lesson) {
    var lab = lesson.lab;
    if (!lab) return;
    var card = el('div', 'lab-card');
    card.appendChild(el('div', 'lab-head', '<span class="lab-badge">' +
      (isBasicRoute() ? 'Дополнительная практика' : 'Лабораторная') + '</span> ' + esc(lab.title)));
    if (lab.description) card.appendChild(el('p', 'lab-desc', esc(lab.description)));
    if (lab.branch) {
      var links = 'JDK 21 и Maven · Инструкция в <a href="' +
        LAB_REPO + '/blob/' + encodeURIComponent(lab.branch) + '/README.md"><code>' +
        esc(lab.branch) + '</code></a>';
      if (lab.branchSolution) {
        links += ' · Эталон в <a href="' + LAB_REPO + '/tree/' +
          encodeURIComponent(lab.branchSolution) + '"><code>' + esc(lab.branchSolution) + '</code></a>';
      }
      card.appendChild(el('div', 'lab-branches', links));
      if (lab.hasTests) {
        card.appendChild(el('p', 'lab-branches',
          'В заготовке есть падающие проверки. Запусти <code>' +
          esc(lab.testCommand || 'mvn test') + '</code> после выполнения.'));
      }
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
    if (isBasicRoute() && lesson.id !== 'course-trainer' && !BASIC_LESSONS.includes(lesson)) {
      rememberRoute('full');
    }

    renderSidebar(app, lesson.id);

    var main = el('main', 'content');
    var article = el('article', 'lesson');
    article.innerHTML = lesson.html;
    main.appendChild(article);
    app.appendChild(main);
    if (BASIC_LESSONS.length && lesson === LESSONS[0]) mountRouteIntro(article);
    article.querySelectorAll('.order-exercise').forEach(be101OrderExercise.mount);

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
    article.querySelectorAll('.order-compatibility').forEach(be101OrderCompatibility.mount);

    // экзамен с одним кейсом и одним квизом → вкладки «Кейс / Экзамен»
    var caseSlot = article.querySelector('.case-slot');
    var quizSlot = article.querySelector('.quiz-slot');
    if (caseSlot && quizSlot && lesson.cases.length === 1 && lesson.quizzes.length === 1) {
      var tabs = el('div', 'exam-tabs');
      var tabRow = el('div', 'exam-tab-row');
      var paneCase = el('div', 'exam-pane');
      var paneExam = el('div', 'exam-pane');
      var btnCase = el('button', 'exam-tab', 'Кейс');
      var btnExam = el('button', 'exam-tab', 'Экзамен');
      btnCase.type = 'button';
      btnExam.type = 'button';
      function showTab(which) {
        btnCase.classList.toggle('active', which === 'case');
        btnExam.classList.toggle('active', which === 'exam');
        paneCase.classList.toggle('show', which === 'case');
        paneExam.classList.toggle('show', which === 'exam');
      }
      btnCase.addEventListener('click', function () { showTab('case'); });
      btnExam.addEventListener('click', function () { showTab('exam'); });
      tabRow.appendChild(btnCase);
      tabRow.appendChild(btnExam);
      tabs.appendChild(tabRow);
      caseSlot.parentNode.insertBefore(tabs, caseSlot);
      paneCase.appendChild(caseSlot);
      paneExam.appendChild(quizSlot);
      tabs.appendChild(paneCase);
      tabs.appendChild(paneExam);
      var lp = getLessonProgress(lesson.id);
      showTab(lp.caseDone && lp.caseDone[0] ? 'exam' : 'case');
    }

    // оглавление урока по разделам (h2), если их много
    var heads = article.querySelectorAll('.lesson h2');
    if (heads.length >= 4) {
      var toc = el('div', 'lesson-toc');
      toc.appendChild(el('div', 'lesson-toc-title', 'В этом уроке'));
      var tocList = el('div', 'lesson-toc-list');
      heads.forEach(function (h, i) {
        var link = el('button', 'lesson-toc-link', esc(h.textContent));
        link.type = 'button';
        link.addEventListener('click', function () {
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        tocList.appendChild(link);
      });
      toc.appendChild(tocList);
      var h1 = article.querySelector('h1');
      if (lesson === LESSONS[0] && article.querySelector('[data-order-exercise="read"]')) {
        article.insertBefore(toc, heads[1]);
      } else if (h1 && h1.nextSibling) {
        article.insertBefore(toc, h1.nextSibling);
      } else {
        article.insertBefore(toc, article.firstChild);
      }
    }

    // спец-страницы и навигация
    if (lesson.id === 'course-finish') mountFinishHero(article);
    if (lesson.id === 'course-trainer') mountTrainer(article);
    appendLessonNav(article, lesson);

    // mermaid-диаграммы
    if (window.mermaid) {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: currentTheme() === 'dark' ? 'dark' : 'neutral',
          locale: 'ru',
        });
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
