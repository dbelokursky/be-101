---
id: m3-lesson-05
title: "Миграции и прод: Liquibase"
module: 3
moduleTitle: "Данные"
order: 5
---

# Урок 5. Миграции и прод: Liquibase

В лабах мы использовали `ddl-auto: create-drop`: Hibernate сам создавал схему и сам её убивал. Это удобно для песочницы и недопустимо в проде: там схема — не побочный эффект кода, а управляемая история изменений. Этим занимается **Liquibase**.

## Почему не ddl-auto

| | `ddl-auto: create/update` | Миграции |
|---|---|---|
| Что происходит | Hibernate создаёт/дописывает схему при старте по entity | Схема изменяется явно перечисленными шагами |
| Контроль | «Как получится»: переименовал поле — Hibernate создаст новое, старое останется | Каждый шаг описан и прошел ревью |
| Откаты | Нет | У changeset'ов есть rollback-стратегия |
| История | Отсутствует | Кто, когда, что и зачем — в таблице changelog |
| Прод | Запрещён | Стандарт |

Главный риск `update`: он умеет **добавлять**, но не умеет переименовывать и удалять. Переименовали `name` в `full_name` — получили обе колонки: старая с данными, новая пустая. И никто не узнает, когда это случилось.

## Liquibase: changelog и changeset

История изменений — XML/YAML/SQL-файл, **changeset — один атомарный шаг**:

```yaml
# src/main/resources/db/changelog/db.changelog-master.yaml
databaseChangeLog:
  - include:
      file: db/changelog/v1-init-schema.yaml
  - include:
      file: db/changelog/v2-add-deadline-index.yaml
```

```yaml
# v1-init-schema.yaml
databaseChangeLog:
  - changeSet:
      id: create-projects
      author: dbelokursky
      changes:
        - createTable:
            tableName: projects
            columns:
              - column: { name: id, type: bigint, autoIncrement: true, constraints: { primaryKey: true } }
              - column: { name: name, type: varchar(100), constraints: { nullable: false } }
  - changeSet:
      id: create-tasks
      author: dbelokursky
      changes:
        - createTable:
            tableName: tasks
            columns:
              - column: { name: id, type: bigint, autoIncrement: true, constraints: { primaryKey: true } }
              - column: { name: project_id, type: bigint, constraints: { nullable: false, referencedTableName: projects, referencedColumnNames: id, foreignKeyName: fk_tasks_project } }
              - column: { name: title, type: varchar(200), constraints: { nullable: false } }
              - column: { name: done, type: boolean, defaultValueBoolean: false, constraints: { nullable: false } }
```

При старте приложения Liquibase:

1. Смотрит в служебную таблицу `DATABASECHANGELOG`: какие changeset'ы уже применены
2. Применяет **только новые**, по порядку, каждый в транзакции
3. Записывает, кто/когда/чек-сумма

Изменения кода review'ятся, изменения схемы — тоже: PR в changelog = ревью миграции до прода.

## Правила боевых миграций

1. **Changeset неизменен после применения.** Поправил уже применённый changeset — чек-сумма не совпадёт, Liquibase откажется стартовать. Новое изменение = новый changeset.
2. **Один changeset — одно изменение.** Откатить/повторить точечно проще.
3. **Expand → contract** для опасных изменений. Убрать колонку, пока её читает старая версия приложения:
   - v102 (expand): добавить новую колонку, начать писать в обе
   - выкатить код, который читает только новую; подождать, пока старые инстансы уйдут
   - v107 (contract): удалить старую колонку
4. **Данные мигрируем кодом миграций**, не «руками в базе»: `sql`-changeset с UPDATE — нормально.
5. Индексы на больших таблицах — с оговорками СУБД (`CREATE INDEX CONCURRENTLY` в Postgres).

> **🔧 QA:** миграции — тестируемый артефакт: если changelog применяется на чистой базе в CI (Testcontainers), то и на стейджинге применится. Проверяйте миграции на копии прод-данных: «схема применилась, а данные не влезли в NOT NULL» — классика.

> **📐 Аналитики:** changeset'ы — это история схемы с авторами и датами. Требование «поле обязательно» (= NOT NULL) — это не комментарий в коде, а миграция, которая на глазах изменила правила игры: после неё пустых значений не будет. Участвуйте в ревью таких миграций.

## Подключение в Spring Boot

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate   # schema создаёт Liquibase; Hibernate только ПРОВЕРЯЕТ соответствие
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml
```

Золотая пара: **Liquibase создаёт схему, `ddl-auto: validate` сверяет entity со схемой** при старте. Расхождение — приложение не стартует: ошибка найдена на деплое, а не в рантайме.

## Тесты с базой: Testvironments за одну строку

Модуль закрывает логика: лабы используют H2 — быстро и без инфраструктуры. Но H2 — не PostgreSQL: диалекты различаются. Честные интеграционные тесты поднимают **настоящую** базу в Docker через **Testcontainers**:

```java
@Testcontainers
@SpringBootTest
class TaskRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");
}
```

Контейнер стартует на время тестов, Liquibase накатывает миграции, тесты гоняются на настоящем PostgreSQL. Медленнее H2, зато диалект, индексы и блокировки — настоящие. В командной практике: юнит-логика на H2/моках, репозитории и миграции — на Testcontainers.

## Итог

- Схема прода управляется миграциями, не `ddl-auto`: история, ревью, откаты
- Changeset — атомарный шаг; применённый changeset не редактируют — добавляют новый
- Опасные изменения — по схеме expand → contract
- `ddl-auto: validate` + Liquibase: расхождение entity и схемы валит старт — так и задумано
- H2 — для быстрых лаб; Testcontainers — для честных тестов на настоящем PostgreSQL

Модуль «Данные» пройден: SQL-фундамент, entity-связи, N+1, транзакции, миграции. Экзамен и кейс — впереди.

## Квиз

```quiz
- type: single
  question: "Разработчик переименовал колонку name в full_name и задеплоил с ddl-auto: update. Что случится с базой?"
  options:
    - "Появится новая пустая колонка full_name, старая name останется с данными: update не умеет переименовывать"
    - "Колонка аккуратно переименуется"
    - "База откатится к прошлой версии"
    - "Hibernate спросит подтверждение у разработчика"
  correct: 0
  explanation: "Update только добавляет. «Переименование» превращается в новую пустую колонку при живой старой — данные и код молча расходятся. Поэтому в проде — миграции."

- type: multi
  question: "Что даёт таблица DATABASECHANGELOG? (несколько ответов)"
  options:
    - "Знает, какие changeset'ы уже применены — повторного применения не будет"
    - "Хранит автора и время каждого изменения"
    - "Хранит чек-сумму: правка уже применённого changeset'а будет замечена"
    - "Автоматически откатывает любые изменения"
  correct: [0, 1, 2]
  explanation: "Это журнал применённых изменений и детектор вмешательства. Откат — отдельная история (rollback у changeset'а или обратная миграция), автоматически «любые» не откатываются."

- type: single
  question: "Нужно переименовать колонку, которую читает работающая версия приложения. Какой порядок безопасен?"
  options:
    - "Expand: добавить новую и писать в обе → выкатить код на новую → подождать ухода старых инстансов → contract: удалить старую"
    - "Сразу переименовать в одной миграции и перезапустить приложение"
    - "Удалить старую колонку, потом добавить новую"
    - "Ничего не делать: колонки нельзя переименовывать"
  correct: 0
  explanation: "Expand-contract сводит окно несовместимости к нулю: в любой момент есть схема, с которой живёт и старый, и новый код."

- type: single
  question: " ddl-auto: validate + Liquibase. Разработчик добавил в entity поле, но забыл миграцию. Что произойдёт?"
  options:
    - "Приложение не стартует: Hibernate не найдёт колонку в схеме — ошибка обнаружена сразу"
    - "Приложение стартует, поле всегда null"
    - "Liquibase автоматически создаст колонку по entity"
    - "Ничего: validate ни на что не влияет"
  correct: 0
  explanation: "Validate сверяет entity со схемой и валирует старт при расхождении. Это переносит ошибку из «тихого рантайм-бага» в громкий отказ на деплое."

- type: blank
  question: "Как называется атомарный единичный шаг изменения схемы в Liquibase? (одно слово)"
  answers:
    - "changeset"
    - "changeSet"
    - "чейнджсет"
  explanation: "ChangeSet: id + author + изменения. Применяется один раз, транзакционно, неизменен после применения."

- type: match
  question: "Сопоставь инструмент и его роль."
  pairs:
    - left: "ddl-auto: create-drop"
      right: "Песочница: схема создаётся и умирает с приложением"
    - left: "Liquibase"
      right: "Управляемая история изменений схемы"
    - left: "ddl-auto: validate"
      right: "Страховка: entity должен совпадать со схемой"
    - left: "Testcontainers"
      right: "Настоящий PostgreSQL в тестах через Docker"

- type: single
  question: "Чем тесты на Testcontainers принципиально лучше тестов на H2 для репозиториев?"
  options:
    - "Тестируется настоящий PostgreSQL: диалект SQL, индексы, блокировки, миграции — как в проде"
    - "Они быстрее H2"
    - "Они не требуют Docker"
    - "H2 не поддерживает SQL"
  correct: 0
  explanation: "H2 быстро и удобно для логики, но это другая СУБД: SQL-диалект и поведение блокировок отличаются. Testcontainers медленнее и требует Docker — зато честно."
```
