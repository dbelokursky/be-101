---
id: m3-cheatsheet
title: "Шпаргалка модуля"
module: 3
moduleTitle: "Данные"
order: 7
---

# Шпаргалка: Данные

## SQL одним взглядом

```sql
SELECT id, title FROM tasks WHERE done = false ORDER BY deadline;
INSERT INTO tasks (project_id, title) VALUES (7, 'Молоко');
UPDATE tasks SET done = true WHERE id = 42;
DELETE FROM tasks WHERE id = 42;

SELECT p.name, COUNT(*) FROM tasks t
JOIN projects p ON p.id = t.project_id
GROUP BY p.name HAVING COUNT(*) > 5;
```

- PK — идентичность строки; FK — связь + ссылочная целостность
- Многие-ко-многим → таблица-связка `task_assignees(task_id, user_id)`
- Нет индекса по колонке поиска → полный перебор → «на проде медленно»

## JPA: аннотации связей

```java
@ManyToOne(fetch = LAZY) @JoinColumn(name = "project_id")  // ВЛАДЕЛЕЦ (там FK)
@OneToMany(mappedBy = "project", cascade = ALL, orphanRemoval = true) // зеркало
```

- Всегда `LAZY` на `@ManyToOne` (дефолт EAGER — ловушка)
- Dirty checking: изменение managed-entity в транзакции = сам станет UPDATE
- Ленивая связь вне транзакции → `LazyInitializationException`

## N+1

Симптом: 1 + N однотипных SELECT'ов, время растёт с данными.

| Средство | Как |
|---|---|
| `@Query("... join fetch p.tasks")` | один SQL со связью |
| `@EntityGraph(attributePaths = "tasks")` | то же, декларативно |
| `hibernate.default_batch_fetch_size=16` | пачки `IN (...)` |
| Агрегат в базе | `count(t)` вместо `getSize()` по загруженным |

Пагинация — только `Pageable` (LIMIT/OFFSET в SQL).

## Транзакции

- `@Transactional`: границы = метод; **публичный** вызов через прокси (внутренний `this.` не работает!)
- unchecked → откат; checked → по умолчанию коммит (`rollbackFor`)
- Гонки: `SELECT FOR UPDATE` (ждать) / `@Version` (повторить) / атомарный `UPDATE ... WHERE qty > 0`
- READ COMMITTED (дефолт PG) от гонок чтение-запись не спасает

## Миграции Liquibase

- Схему прода ведут changeset'ы; применённый — не редактировать (чек-сумма)
- Опасное удаление — expand → contract
- `ddl-auto: validate` + Liquibase: разошлись entity и схема → не стартует (так и надо)
- Честные тесты — Testcontainers (настоящий Postgres), H2 — для быстрых лаб
