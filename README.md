# Лаба 4. GraphQL (после урока «GraphQL»)

Схема есть, хранилище есть, потребители (тесты) уже прислали свои запросы.
Ваша задача — обслужить контракт: три метода с `@QueryMapping`/`@MutationMapping`.

## Как начать

```bash
git checkout lab-4
mvn test
```

Тесты красные — без ваших методов контракта Spring GraphQL не может поднять схему
(в ошибке будет имя незакрытого поля). Откройте:

| Файл | Статус |
|---|---|
| `src/main/resources/graphql/schema.graphqls` | **готов, не менять** — это договор |
| `task/TaskStore.java` | **готов** — хранилище в памяти (2 задачи) |
| `task/TaskGraphqlController.java` | **TODO** — три метода |
| `src/test/.../TaskGraphqlTest.java` | приёмник: 6 запросов клиента |

## Что написать

```java
@QueryMapping
public List<Task> tasks(@Argument Boolean done) { ... }   // store.find(done)

@QueryMapping
public Task task(@Argument String id) { ... }             // store.findById(id).orElse(null)

@MutationMapping
public Task completeTask(@Argument String id) { ... }     // store.complete(id)
```

Импорт аннотаций: `org.springframework.graphql.data.method.annotation.*`.
Возвращаемый Java-тип — обычный record `Task`: Spring GraphQL сам превратит его
в ответ по форме запроса клиента (поле `done` → `isDone`/`done` понимается само).

## Поиграть руками

```bash
mvn spring-boot:run
```

Открой <http://localhost:8080/graphiql> — песочница GraphiQL. Попробуйте:

```graphql
query { tasks(done: false) { title projectName } }
mutation { completeTask(id: "2") { id done } }
```

## Сверка с решением

```bash
git stash && git checkout lab-4-solution
mvn test
git checkout lab-4 && git stash pop
```

## Чек-лист

- [ ] `mvn test` — 6 из 6 зелёные
- [ ] Вы понимаете разницу: schema.graphqls — договор, `@QueryMapping` — исполнение
- [ ] В GraphiQL попробовали запрос с другими полями и увидели, как меняется ответ

Готово — галочка на странице урока «GraphQL». Модуль «Проектирование API» закрыт полностью.
