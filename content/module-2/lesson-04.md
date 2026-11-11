---
id: m2-lesson-04
title: GraphQL
module: 2
moduleTitle: "Проектирование API"
order: 4
lab:
  title: "Лаба 4. GraphQL"
  description: "Обслужить готовую GraphQL-схему задачника: @QueryMapping и @MutationMapping над готовым хранилищем. Проверка — 6 запросов-тестов и песочница GraphiQL."
  branch: lab-4
  branchSolution: lab-4-solution
  hasTests: true
  testCommand: mvn test
---

# Урок 4. GraphQL: API, где клиент заказывает данные

REST-контракт жёсток: сервер решил, какие поля отдать, — клиент получает их все. Обычно это ок. Но у фронтенда бывают экраны, где REST либо отдаёт лишнее, либо требует нескольких запросов. На этот случай есть другой стиль — GraphQL.

## Две боли REST

**Over-fetching (лишние данные).** Экрану «список задач» нужно только `title` и `done`, а `GET /api/tasks` отдаёт ещё описание, автора, историю, вложения — тянет из базы, сериализует, гонит по сети.

**Under-fetching (мало данных).** Список задач получили. Теперь для каждой — имя проекта: `GET /api/projects/7`, `GET /api/projects/8`… Классический **N+1**: 1 запрос за списком + N запросов за деталями.

GraphQL отвечает на обе боли одним приёмом: клиент описывает в запросе, какие именно поля ему нужны.

## Схема и запрос

Сначала сервер описывает **схему** — какие типы и поля существуют (файл `schema.graphqls` в Spring-проекте):

```graphql
type Task {
    id: ID!
    title: String!
    done: Boolean!
    deadline: String
    project: Project!          # вложенный объект!
}

type Project {
    id: ID!
    name: String!
}

type Query {
    tasks(done: Boolean): [Task!]!
    task(id: ID!): Task
}
```

`!` — «не null». `[Task!]!` — «список не-null задач, сам список тоже не null». Читается как типы в TS.

Клиент отправляет **запрос** — заказывает ровно то, что нужно экрану:

```graphql
query {
    tasks(done: false) {
        title
        done
        project { name }
    }
}
```

И получает **ровно это** — ни полем больше:

```json
{
  "data": {
    "tasks": [
      { "title": "Купить молоко", "done": false, "project": { "name": "Дом" } },
      { "title": "Ревью PR", "done": false, "project": { "name": "Работа" } }
    ]
  }
}
```

Один эндпоинт (`POST /graphql`), один запрос, вложенность на любую глубину схемы, форма ответа повторяет форму запроса. Over-fetching и N+1 с точки зрения клиента исчезли.

Изменения данных — **мутации**:

```graphql
mutation {
    completeTask(id: 42) {
        id
        done
    }
}
```

## Как это выглядит в Spring Boot

```java
@Controller
public class TaskGraphqlController {

    private final TaskService taskService;

    public TaskGraphqlController(TaskService taskService) {
        this.taskService = taskService;
    }

    @QueryMapping                       // обслуживает поле tasks из схемы
    public List<Task> tasks(@Argument Boolean done) {
        return taskService.find(done);
    }

    @MutationMapping                    // обслуживает мутацию completeTask
    public Task completeTask(@Argument Long id) {
        return taskService.complete(id);
    }
}
```

Тот же сервисный слой, те же сущности — меняется только «обвязка»: вместо `@GetMapping` — `@QueryMapping`. REST и GraphQL спокойно живут в одном приложении рядом: REST для простых интеграций, GraphQL для насыщенных фронтендов.

## GraphQL vs REST: что когда

| | REST | GraphQL |
|---|---|---|
| Форма ответа | Задаёт сервер | Заказывает клиент |
| Число эндпоинтов | Много | Один (`/graphql`) |
| Кэширование HTTP | Естественное (GET, CDN) | Сложнее (всё через POST) |
| Инструменты | Все привыкли | GraphiQL, типизированные клиенты |
| Валидация контракта | OpenAPI-спека | Схема — сама спека, валидируется рантаймом |
| Хорош когда | Простые CRUD-интеграции, кэш, публичные API | Сложные экраны, много клиентов с разными потребностями |

GraphQL — не «замена REST», а инструмент под конкретную боль. Внутри компании: мобильный клиент с медленной сетью и богатым UI — GraphQL; webhook для партнёра — REST.

Одно предостережение: гибкость GraphQL ложится на сервер. Клиент может заказать `project { tasks { project { tasks ... } } }` — и сервер должен отвечать быстро и не падать. В Spring это решается дозагрузкой данных пачками (batching), но это уже глубина для бэкенд-разработки.

> **💡 Фронтендерам:** если вы работали с Apollo/Relay — вы уже писали эти запросы. Новое здесь — обратная сторона: как серверу жить с произвольными запросами, и почему бэкендеры иногда просят «не запрашивайте это поле в списке».

> **🔧 QA-инженерам:** тестируя GraphQL, проверяйте не только форму «что попросили — то получили», но и границы: запросы огромной глубины, отсутствующие поля, ошибки в одном поле запроса (GraphQL не падает целиком — возвращает data и errors одновременно!).

> **📐 Аналитикам:** в GraphQL сущности и связи схемы видны напрямую: `Task.project` — задача связана с проектом. Схема — почти ваша ER-диаграмма предметной области, и она же — исполняемый контракт.

## Итог

- GraphQL лечит over-fetching и under-fetching: клиент заказывает ровно нужные поля одним запросом
- Сервер описывает схему (типы, Query, Mutation); ответ повторяет форму запроса
- В Spring: `@QueryMapping`/`@MutationMapping` поверх того же сервисного слоя; REST и GraphQL живут рядом
- Выбор — не религия: REST — простота и кэш, GraphQL — гибкие богатые клиенты
- Цена гибкости — сложность сервера: произвольные запросы надо уметь обслуживать быстро

Последний урок модуля — как контракт (любой: OpenAPI или GraphQL-схема) живёт в процессах команды.

## Квиз

```quiz
- type: single
  question: "Экрану нужны только title задач, а REST отдаёт 12 полей, включая тяжёлую историю изменений. Как называется эта боль?"
  options:
    - "Over-fetching: клиент получает лишние данные"
    - "Under-fetching: клиенту не хватает данных"
    - "N+1: запросов слишком много"
    - "Блокировка: запросы идут последовательно"
  correct: 0
  explanation: "Over-fetching — «слишком много дали». Сервер тянет из базы и сериализует поля, которые клиент выбросит."

- type: single
  codeLang: graphql
  code: |
    query {
        task(id: 42) {
            title
            project { name }
        }
    }
  question: "Что вернёт сервер на такой GraphQL-запрос (при валидной схеме из урока)?"
  options:
    - "Объект с title задачи и name её проекта — только эти поля"
    - "Всю задачу целиком: GraphQL всегда отдаёт все поля"
    - "Только id — по нему клиент дорезолвит остальное"
    - "Ошибку: в одном запросе нельзя просить вложенные объекты"
  correct: 0
  explanation: "Форма ответа повторяет форму запроса: попросили title и project.name — ровно их и получили. Вложенность — норма GraphQL."

- type: single
  question: "Почему в GraphQL всё ходит через POST /graphql и с этим больно кэшировать на уровне HTTP?"
  options:
    - "POST-тело не кэшируется стандартными HTTP-механизмами, в отличие от GET с его URL и CDN"
    - "GraphQL не работает по HTTP"
    - "POST медленнее GET в любом случае"
    - "Серверы запрещают кэшировать ответы GraphQL"
  correct: 0
  explanation: "HTTP-кэширование завязано на GET и URL. Весь GraphQL — POST с телом-запросом, стандартные механизмы мимо. Кэш строят на уровне клиентов (Apollo cache и др.)."

- type: multi
  question: "Что верно про схему GraphQL? (несколько ответов)"
  options:
    - "type Task { ... } описывает тип и его поля — как интерфейс в TS"
    - "Восклицательный знак (String!) означает «не null»"
    - "Схему пишет клиент под каждый экран"
    - "Query и Mutation — корневые типы: входные точки чтения и изменения"
  correct: [0, 1, 3]
  explanation: "Схему описывает сервер один раз — это контракт. Клиенты лишь выбирают подмножество полей в своих запросах."

- type: blank
  question: "Как называется GraphQL-операция изменения данных (аналог POST/PATCH в REST)? (одно слово)"
  answers:
    - "mutation"
    - "мутация"
  explanation: "Mutation. Чтение — query, изменение — mutation; в Spring их обслуживают @QueryMapping и @MutationMapping."

- type: single
  question: "Вы проектируете API для партнёрского webhook-интегратора и для своего мобильного приложения с 20 экранами. Что разумно?"
  options:
    - "Партнёру — простой REST (кэш, привычность, минимум движущихся частей); приложению — GraphQL под разные экраны"
    - "Всем GraphQL: зачем два стиля"
    - "Всем REST: GraphQL — хайп"
    - "Партнёру — GraphQL, приложению — REST"
  correct: 0
  explanation: "Инструмент под потребителя. Партнёру важна предсказуемость и кэшируемость; своему приложению с богатыми экранами — гибкость заказов. Оба живут в одном Spring-приложении."

- type: single
  codeLang: java
  code: |
    @QueryMapping
    public List<Task> tasks(@Argument Boolean done) {
        return taskService.find(done);
    }
  question: "Что делает этот код в Spring-приложении со схемой GraphQL?"
  options:
    - "Обслуживает запросы к полю tasks схемы, передавая аргумент done в сервис"
    - "Создаёт REST-эндпоинт /tasks?done=..."
    - "Определяет новый тип в схеме GraphQL"
    - "Публикует событие в Kafka"
  correct: 0
  explanation: "@QueryMapping связывает поле Query.tasks из schema.graphqls с методом. Схема описывает контракт, метод — его исполнение; @Argument достаёт аргументы запроса."
```
