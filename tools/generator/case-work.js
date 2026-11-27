/* Черновики остаются в браузере. Учебный прогресс хранится отдельно. */
const be101CaseWork = (() => {
  const unsaved = new Map();

  function keyFor(lessonId, caseIndex, part) {
    return `be101.case-draft.v1.${lessonId}.${caseIndex}.${part}`;
  }

  function load(lessonId, caseIndex, part) {
    const key = keyFor(lessonId, caseIndex, part);
    if (unsaved.has(key)) return { text: unsaved.get(key), saved: false };
    try {
      return { text: localStorage.getItem(key) ?? '', saved: true };
    } catch (_) {
      return { text: '', saved: false };
    }
  }

  function save(lessonId, caseIndex, part, text) {
    const key = keyFor(lessonId, caseIndex, part);
    try {
      if (text === '') localStorage.removeItem(key);
      else localStorage.setItem(key, text);
      unsaved.delete(key);
      return true;
    } catch (_) {
      unsaved.set(key, text);
      return false;
    }
  }

  function markdown(lesson, caseIndex, answer, review) {
    const exercise = lesson.cases[caseIndex];
    const sections = [
      `# ${exercise.title}`,
      `Урок «${lesson.title}»`,
      '## Задание',
      exercise.task,
      '## Решение',
      answer.trimEnd(),
    ];
    if (review.trim()) sections.push('## Самооценка по разбору', review.trimEnd());
    return sections.join('\n\n') + '\n';
  }

  return { load, save, markdown };
})();
