---
id: m3-lesson-03
title: "N+1 и производительность запросов"
module: 3
moduleTitle: "Данные"
order: 3
---

# Урок 3. N+1 и производительность запросов

Этот урок — про самую знаменитую производительную болезнь Spring-приложений. Она не видна на локале с десятью строками и выстреливает на проде с десятью тысячами. Умеете видеть N+1 — умеете читать чужие «почему так медленно».

## Проблема

Задача: список проектов, у каждого — количество задач. Наивный код:

```java
List<Project> projects = projectRepository.findAll();      // 1 запрос
for (Project p : projects) {
    int n = p.getTasks().size();                            // N запросов!
}
```

Что происходит в базе:

```text
SELECT * FROM projects;                      -- 1 раз
SELECT * FROM tasks WHERE project_id = 1;    -- для первого проекта
SELECT * FROM tasks WHERE project_id = 2;    -- для второго
...
SELECT * FROM tasks WHERE project_id = N;    -- для N-го
```

**1 + N запросов** — отсюда имя. 50 проектов = 51 поездка в базу. Каждая поездка — сеть, парсинг, план запроса. Локально всё мгновенно, на проде — секунды.

> **🔧 QA:** симптом N+1 — «эндпоинт линейно замедляется с ростом данных» и лес одинаковых SELECT'ов в логах. Включите `spring.jpa.properties.hibernate.generate_statistics=true` на стенде: в логе будет «JDBC statements» — и их количество скажет всё.

## Лечение 1: JOIN FETCH

Сказать Hibernate: «грузи задачи сразу вместе с проектами, одним запросом»:

```java
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("select distinct p from Project p left join fetch p.tasks")
    List<Project> findAllWithTasks();
}
```

Сгенерированный SQL — один: `SELECT ... FROM projects p LEFT JOIN tasks t ON ...`. Прокси не нужны, сессия закрывается — данные уже на месте (заодно решает LazyInitializationException из прошлого урока).

`distinct` в JPQL — важная деталь: JOIN размножает строки проектов (проект × каждая задача), Hibernate дедуплицирует.

## Лечение 2: @EntityGraph

То же самое без JPQL, декларативно:

```java
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @EntityGraph(attributePaths = "tasks")
    @Query("select p from Project p")
    List<Project.findAllWithTasks();   // или совсем без @Query — на derived-методах
}
```

`attributePaths` перечисляет, какие ленивые связи догрузить сразу. Идеально, когда граф фиксированный.

## Когда лечить не надо

Если бы нужно только **количество** задач — тащить сами задачи расточительно. Правильнее считать в базе:

```java
@Query("select p.name, count(t) from Project p left join p.tasks t group by p.name")
List<Object[]> projectNameToTaskCount();   // или сразу в DTO-проекцию
```

Правило: **не тяните в Java то, что база посчитает дешевле**. COUNT, SUM, сортировка, первая страница — это работа СУБД.

## Пагинация на уровне базы

`findAll()` на большой таблице — вернуть миллион строк в память приложения. Пагинация обязательна, и она должна быть **в SQL**:

```java
Page<Project> page = projectRepository.findAll(PageRequest.of(0, 20));  // LIMIT 20 OFFSET 0
```

Spring Data добавит `LIMIT/OFFSET` и отдельно посчитает тотал. Пагинация стрим-ом в Java (`list.stream().skip(...).limit(...)`) — антипаттерн: все строки уже в памяти.

Осторожно с `Page` + `JOIN FETCH` на коллекции: LIMIT в SQL размноженном JOIN'ом режет не проекты, а строки — Hibernate честно предупредит (HHH000104). Для «страница с подтянутой коллекцией» используют два запроса или `@BatchSize`.

## @BatchSize: золотая середина

```properties
spring.jpa.properties.hibernate.default_batch_fetch_size=16
```

Вместо N запросов по одному Hibernate соберёт их в пачки `IN (...)`: `SELECT ... WHERE project_id IN (1,2,...,16)`. Из 51 запроса станет ~4. Не идеал одного JOIN'а, но решает проблему массово и без правок каждого запроса.

## Как заметить N+1 до прода

1. **Логи SQL в деве**: `spring.jpa.show-sql=true` — лес одинаковых SELECT'ов виден глазами
2. **Статистика Hibernate** на тестовом стенде: количество statements на запрос
3. **Тесты данных**: в лабе этого модуля тест сам посчитает запросы к базе и покраснеет, если их слишком много
4. **Прод-метрики**: время ответа растёт с данными — включайте точечный лог медленных запросов

> **💡 Фронтендерам:** если бэкенд отдаёт список медленно — попросите включить SQL-логи. N+1 часто лечится одной аннотацией на репозитории, а «оптимизация фронта» тут бессильна. Теперь вы знаете, как назвать болезнь 🙂

## Итог

- N+1: 1 запрос за списком + N за ленивыми связями каждого элемента; локально незаметно, на проде больно
- Лечение: `JOIN FETCH` в @Query или `@EntityGraph(attributePaths=...)` — один SQL со связью
- Считать (count/sum/первые N) — в базе, проекциями и агрегатами, не в Java
- Пагинация — только через `Pageable` (LIMIT/OFFSET в SQL)
- `default_batch_fetch_size` — массовая полумера: пачки `IN (...)` вместо одиночек
- Показатель здоровья: количество SQL-запросов на операцию — логи, статистика, тесты

## Квиз

```quiz
- type: single
  codeLang: java
  code: |
    List<Project> projects = projectRepository.findAll();   // 1
    for (Project p : projects) {
        report.add(p.getName() + ": " + p.getTasks().size()); // связь LAZY
    }
  question: "В базе 40 проектов. Сколько SQL-запросов сделает этот код?"
  options:
    - "41: один за проектами и по одному за задачи каждого"
    - "1: задачи подгрузятся в том же запросе"
    - "40: только запросы за задачами"
    - "2: проекты и все задачи одним списком"
  correct: 0
  explanation: "Классический 1+N. Обращение к ленивой коллекции каждого проекта — отдельный SELECT. 40 проектов → 1 + 40 = 41 запрос."

- type: single
  question: "Чем @EntityGraph(attributePaths = \"tasks\") на методе репозитория отличается от JOIN FETCH в @Query?"
  options:
    - "По сути не отличаются: оба дают одну поездку в базу с LEFT JOIN; EntityGraph — декларативнее, без JPQL"
    - "EntityGraph работает только на findAll"
    - "JOIN FETCH грузит данные в память приложения, а EntityGraph — в базу"
    - "EntityGraph быстрее в 10 раз"
  correct: 0
  explanation: "Оба механизма превращают ленивую связь в жадную для конкретного запроса одним SQL. Выбор — стиль команды: аннотация против JPQL."

- type: multi
  question: "Какие приёмы уменьшат число запросов или нагрузку? (несколько ответов)"
  options:
    - "hibernate.default_batch_fetch_size=16 — ленивые загрузки пачками IN (...)"
    - "Количество задач считать агрегатом в базе, а не getSize() по загруженным задачам"
    - "Постранично отдавать через Pageable вместо findAll()"
    - "Поставить @ManyToOne обратно EAGER — пусть грузится всегда"
  correct: [0, 1, 2]
  explanation: "EAGER не лечит N+1, а делает его постоянным и неуправляемым: грузит связь даже там, где не просили."

- type: single
  codeLang: java
  code: |
    @Query("select distinct p from Project p left join fetch p.tasks")
    List<Project> findAllWithTasks();
  question: "Зачем здесь distinct?"
  options:
    - "JOIN размножает строки (проект × задача); distinct просит Hibernate дедуплицировать проекты в памяти"
    - "Он добавляет DISTINCT в SQL — иначе не скомпилируется"
    - "Он включает пагинацию"
    - "Он ускоряет базу за счёт индекса"
  correct: 0
  explanation: "В SQL строк действительно больше (это нормально), а distinct — сигнал Hibernate собрать из них уникальные entity. Без него проектов в списке было бы по числу задач."

- type: single
  question: "Нужна страница проектов: 20 штук, у каждого — задачи. Что НЕ так с page + JOIN FETCH на коллекции?"
  options:
    - "LIMIT/OFFSET режет размноженные JOIN'ом строки: 20 «строк» ≠ 20 проектов — Hibernate предупредит HHH000104"
    - "Ничего: это штатная комбинация"
    - "JOIN FETCH не работает с Pageable"
    - "Страницы нельзя отдавать со связями"
  correct: 0
  explanation: "Пагинация с fetch-коллекцией применяется к строкам JOIN, а не к сущностям. Решения: @BatchSize + обычная пагинация, два запроса (страница id → fetch по id) или проекция."

- type: blank
  question: "Каким словом называется паттерн «1 запрос за списком + N запросов за связями»? (формат: N+1)"
  answers:
    - "N+1"
    - "n+1"
  explanation: "N+1. Первое, что ищут в логах, когда «работало быстро и стало медленно»."

- type: single
  question: "Эндпоинт «отчёт по проектам» грузит все проекты в память, стримом считает суммы по задачам и сортирует. База — миллион строк. С чего начать?"
  options:
    - "Перенести агрегацию и сортировку в SQL-проекцию и добавить пагинацию"
    - "Поднять памяти под JVM"
    - "Добавить кэш на весь отчёт и не трогать код"
    - "Разбить отчёт на несколько эндпоинтов"
  correct: 0
  explanation: "Миллион строк в память приложения — всегда проигрыш: сеть, GC, время. COUNT/SUM/GROUP BY и LIMIT — работа СУБД; Java получает готовые маленькие цифры."
```
