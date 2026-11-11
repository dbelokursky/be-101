# Лаба 2. Финальный срез (после урока 5)

Экзаменационная лаба: полный путь **контроллер → сервис → репозиторий → H2** своими руками.
Здесь проверку делает не сверка с решением, а **автотесты**: они уже написаны в
`src/test/.../TaskApiTest.java` и сейчас красные. Ваша задача — `mvn test` зелёный.

Тесты — это контракт API, записанный кодом: читайте их как постановку задачи.

## Как начать

```bash
git checkout lab-2
mvn test
```

Убедитесь, что тесты красные (6 упало) — так и задумано. Дальше ищите `TODO`:

| # | Файл | Задача |
|---|---|---|
| 1 | `TaskRepository.java` | Превратить в Spring Data-репозиторий + `findByProjectId` |
| 2 | `dto/TaskResponse.java` | Поля ответа: `id`, `title`, `deadline`, `done`, `projectId` |
| 3 | `dto/CreateTaskRequest.java` | Поля: `title` (с `@NotBlank`!), `deadline` |
| 4 | `dto/PatchTaskRequest.java` | Одно поле: `Boolean done` (обёртка — чтобы отличить null от false) |
| 5 | `TaskMapper.java` | Методы `toResponse` / `toEntity` |
| 6 | `TaskService.java` | `create` / `findByProject` / `patch` с `@Transactional` |
| 7 | `TaskController.java` | Три эндпоинта, 201 + `Location`, `@Valid` |

Готовые файлы (`Task`, `TaskNotFoundException`, `application.yml`) — не трогайте.

## Контракт API (он же — тесты)

| Запрос | Успех | Ошибки |
|---|---|---|
| `POST /api/projects/{projectId}/tasks` `{"title":"...","deadline":"2026-12-01"}` | `201`, `Location: /api/tasks/{id}`, тело задачи | `400` без `title` |
| `GET /api/projects/{projectId}/tasks` | `200`, массив задач | — |
| `PATCH /api/tasks/{id}` `{"done":true}` | `200`, обновлённая задача | `404` если задачи нет |
| `GET /actuator/health` | `200 {"status":"UP"}` | — |

## Стратегия

1. Начните с конца цепочки по тесту `createTaskReturns201WithBodyAndLocation`:
   репозиторий → DTO → маппер → сервис → контроллер. Запускайте `mvn test` после каждого шага —
   красных должно становиться меньше (или ошибки — понятнее).
2. `Location` — подсказка: `ResponseEntity.created(URI.create("/api/tasks/" + id)).body(response)`
3. Застряли больше чем на 20 минут — загляните в решение (ниже), это разрешено.

## Сверка с решением

```bash
git stash && git checkout lab-2-solution
mvn test          # зелёные — так выглядит «как надо»
git checkout lab-2 && git stash pop
```

## Чек-лист

- [ ] `mvn test` — 6 из 6 зелёные
- [ ] Вы можете объяснить каждую аннотацию в своих классах
- [ ] Вы знаете, где в вашем коде контроллер, где сервис, где репозиторий

Это финал пилотного модуля. Дальше — модуль «Проектирование API» (API-First, OpenAPI, GraphQL).
Отметьте лабу на странице урока 5 и вернитесь к курсу: `git checkout develop`.
