/**
 * BE-101 generator: content/*.md -> site/index.html
 *
 * Урок = markdown-файл с YAML-frontmatter (id, title, module, order, lab).
 * Внутри тела урока поддерживаются:
 *   - обычный markdown (с подсветкой кода через highlight.js на этапе сборки)
 *   - ```mermaid — диаграмма (рендерится в браузере mermaid.js)
 *   - ```quiz    — квиз, YAML-список вопросов; рендерится движком engine.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const hljs = require('highlight.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const SITE_DIR = path.join(ROOT, 'site');
const TOOLS_DIR = __dirname;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeForScript(json) {
  // чтобы вложенный </script> не разорвал страницу
  return json.replace(/</g, '\\u003c');
}

// ---------- markdown ----------

const md = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) { /* ignore, fall through */ }
    }
    return '';
  },
});

const defaultFence =
  md.renderer.rules.fence ||
  ((tokens, idx) => `<pre><code>${esc(tokens[idx].content)}</code></pre>`);

// ---------- quiz normalization ----------

const QUIZ_TYPES = new Set(['single', 'multi', 'blank', 'match']);

function highlightQuizCode(q, file) {
  if (!q.code) return;
  const lang = q.codeLang || 'java';
  if (hljs.getLanguage(lang)) {
    try {
      q.codeHtml = hljs.highlight(q.code, { language: lang }).value;
      return;
    } catch (e) { /* fall through */ }
  }
  q.codeHtml = esc(q.code);
}

// кейс: текстовая задача + textarea + эталонный разбор (markdown)
function normalizeCase(c, file) {
  const where = `${file}: блок case`;
  if (!c || typeof c !== 'object') throw new Error(`${where}: ожидается YAML-объект`);
  for (const field of ['title', 'task', 'reference']) {
    if (!c[field]) throw new Error(`${where}: нет поля "${field}"`);
  }
  return {
    title: String(c.title),
    task: String(c.task),
    placeholder: String(c.placeholder || ''),
    referenceHtml: md.render(String(c.reference)),
  };
}

function normalizeQuiz(list, file) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${file}: блок quiz должен быть YAML-списком вопросов`);
  }
  return list.map((q, i) => {
    const where = `${file}: вопрос #${i + 1}`;
    if (!q || !QUIZ_TYPES.has(q.type)) {
      throw new Error(`${where}: неизвестный тип "${q && q.type}" (ожидаются single|multi|blank|match)`);
    }
    if (!q.question) throw new Error(`${where}: пустой вопрос`);
    if (q.type === 'single') {
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`${where}: нужны options (2+)`);
      if (!Number.isInteger(q.correct)) throw new Error(`${where}: нужен correct (индекс)`);
    }
    if (q.type === 'multi') {
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`${where}: нужны options (2+)`);
      if (!Array.isArray(q.correct) || !q.correct.length) throw new Error(`${where}: нужен correct (список индексов)`);
    }
    if (q.type === 'blank') {
      if (!Array.isArray(q.answers) || !q.answers.length) throw new Error(`${where}: нужны answers (допустимые варианты)`);
    }
    if (q.type === 'match') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) throw new Error(`${where}: нужны pairs (2+)`);
      for (const p of q.pairs) {
        if (!p.left || !p.right) throw new Error(`${where}: каждая пара должна иметь left и right`);
      }
    }
    highlightQuizCode(q, file);
    return q;
  });
}

// ---------- collect lessons ----------

function collectLessons() {
  const files = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) files.push(p);
    }
  })(CONTENT_DIR);

  const lessons = files.map((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    for (const field of ['id', 'title', 'module', 'order']) {
      if (data[field] === undefined) {
        throw new Error(`${file}: в frontmatter нет поля "${field}"`);
      }
    }

    const quizzes = [];
    const cases = [];
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = (token.info || '').trim().split(/\s+/)[0];
      if (info === 'quiz') {
        quizzes.push(normalizeQuiz(yaml.load(token.content), file));
        return `<div class="quiz-slot" data-quiz="${quizzes.length - 1}"></div>`;
      }
      if (info === 'case') {
        cases.push(normalizeCase(yaml.load(token.content), file));
        return `<div class="case-slot" data-case="${cases.length - 1}"></div>`;
      }
      if (info === 'mermaid') {
        return `<div class="mermaid">${esc(token.content.trim())}</div>`;
      }
      return defaultFence(tokens, idx, options, env, self);
    };

    const html = md.render(content);
    if (!quizzes.length) {
      console.warn(`⚠️  ${file}: нет ни одного блока \`\`\`quiz — урок не будет засчитываться`);
    }

    return {
      id: String(data.id),
      title: String(data.title),
      module: Number(data.module),
      moduleTitle: data.moduleTitle || null,
      order: Number(data.order),
      lab: data.lab || null,
      html,
      quizzes,
      cases,
    };
  });

  lessons.sort((a, b) => a.module - b.module || a.order - b.order);

  const ids = new Set();
  for (const l of lessons) {
    if (ids.has(l.id)) throw new Error(`дублирующийся id урока: ${l.id}`);
    ids.add(l.id);
  }
  return lessons;
}

// ---------- build ----------

function build() {
  const lessons = collectLessons();
  if (!lessons.length) throw new Error('в content/ не найдено ни одного урока');

  const template = fs.readFileSync(path.join(TOOLS_DIR, 'template.html'), 'utf8');
  const css = fs.readFileSync(path.join(TOOLS_DIR, 'styles.css'), 'utf8');
  const engine = fs.readFileSync(path.join(TOOLS_DIR, 'engine.js'), 'utf8');

  const data = `window.BE101 = ${escapeForScript(JSON.stringify({ lessons }))};`;

  const html = template
    .replace('/*__CSS__*/', () => css)
    .replace('/*__DATA__*/', () => data)
    .replace('/*__ENGINE__*/', () => engine);

  fs.mkdirSync(SITE_DIR, { recursive: true });
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), html);

  // mermaid кладём рядом — работает и с file://
  const mermaidSrc = path.join(
    TOOLS_DIR, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'
  );
  if (!fs.existsSync(mermaidSrc)) {
    throw new Error('mermaid.min.js не найден — выполните npm install');
  }
  fs.copyFileSync(mermaidSrc, path.join(SITE_DIR, 'mermaid.min.js'));

  console.log(`✓ Собрано уроков: ${lessons.length} -> ${path.join(SITE_DIR, 'index.html')}`);
  for (const l of lessons) {
    const qTotal = l.quizzes.reduce((s, q) => s + q.length, 0);
    console.log(`  • ${l.id}: «${l.title}» (${qTotal} вопросов${l.lab ? ', лаба' : ''})`);
  }
}

build();
