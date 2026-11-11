# Лаба 5. Связи и миграции (после модуля «Данные»)

Лаба уровня данных: **Liquibase-миграция + двусторонняя связь entity + каскады**.
Кода немного, но каждый штрих — из уроков модуля: schema через changeset'ы,
владелец связи, LAZY, каскадное сохранение и удаление.

Схема создаётся только Liquibase (`ddl-auto: none`): пока entity и миграция
не сойдутся, тесты честно красные.

## Как начать

```bash
git checkout lab-5
mvn test
```

Четыре красных теста — карта работы. TODO в коде: 1 и 3 — `Task.java`,
2 — `Project.java`, 4 — `db/changelog/v2-tasks.yaml`.

| # | Файл | Задача |
|---|---|---|
| 1 | `Task.java` | `@Table(name = "tasks")` — имя таблицы из миграции |
| 2 | `Project.java` | `@OneToMany(mappedBy = "project", cascade = ALL, orphanRemoval = true)` вместо `@Transient` |
| 3 | `Task.java` | `@ManyToOne(fetch = LAZY)` + `@JoinColumn(name = "project_id")` вместо `@Transient` |
| 4 | `v2-tasks.yaml` | changeset: таблица tasks (id PK, project_id FK → projects.id, title NOT NULL, done NOT NULL) |

Готовое: v1-projects.yaml (образец), репозитории, конфиг с Liquibase.

## Подсказки

- Формат changeset — смотрите v1-projects.yaml; FK внутри `constraints` колонки:
  `referencedTableName: projects, referencedColumnNames: id, foreignKeyName: fk_tasks_project`
- Владелец связи — сторона с FK (`Task.project`); `mappedBy` на зеркальной
- `@Transient` сейчас говорит Hibernate «игнорируй поле» — именно его вы заменяете

## Сверка с решением

```bash
git stash && git checkout lab-5-solution
mvn test          # 4/4 зелёные
git checkout lab-5 && git stash pop
```

## Чек-лист

- [ ] `mvn test` — 4 из 4 зелёные
- [ ] Вы можете нарисовать схему таблиц projects/tasks с FK на бумаге
- [ ] Вы объясняете, почему владелец связи — Task, а mappedBy — на Project

Модуль «Данные» закрыт полностью: теория, экзамен, кейс и практика.
