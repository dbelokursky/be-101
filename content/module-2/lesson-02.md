---
id: m2-lesson-02
title: "OpenAPI: читаем и пишем"
module: 2
moduleTitle: "Проектирование API"
order: 2
---

# Урок 2. OpenAPI: читаем и пишем

Спека OpenAPI — это обычный YAML-файл со стандартной структурой. Научиться её читать — навык на один вечер; уметь писать — вопрос практики. Разберём живой пример: API списка задач из кейса модуля 1.

## Анатомия спеки

```yaml
openapi: 3.1.0                      # версия стандарта
info:                               # метаданные договора
  title: Task API
  version: 1.0.0
  description: API списка задач (модуль BE-101)
servers:
  - url: https://tasks.example.com  # где живёт
paths:                              # ЭНДПОИНТЫ — сердце спеки
  /api/projects/{projectId}/tasks:
    get:
      summary: Задачи проекта
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Список задач
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/TaskResponse"
```

Читается сверху вниз: **info** — что это за API и какая версия, **servers** — адрес, **paths** — эндпоинты. Внутри пути — операции по HTTP-методам (`get`, `post`, `patch`, `delete`), у каждой — параметры и ответы.

## Схемы: словарь договора

Повторяющиеся структуры выносятся в **components/schemas** — это DTO контракта:

```yaml
components:
  schemas:
    TaskResponse:
      type: object
      required: [id, title, done]
      properties:
        id:
          type: integer
          format: int64
        title:
          type: string
          example: Купить молоко
        deadline:
          type: string
          format: date
          nullable: true
        done:
          type: boolean
    CreateTaskRequest:
      type: object
      required: [title]
      properties:
        title:
          type: string
          minLength: 1
        deadline:
          type: string
          format: date
```

На схемы ссылаются по `$ref` — один раз описали `TaskResponse`, переиспользуем в списке, в ответе создания, где угодно. Схемы — это те же `record TaskResponse(...)` из урока 4 модуля 1, только на языке контракта.

Обратите внимание, как валидация из кода переезжает в договор: `required`, `minLength`, `format: date` — потребитель видит правила **до** отправки первого запроса.

## Примеры: документация, которая ездит

В каждую схему и ответ можно вписать `example` — и они попадают в Swagger UI и в тест-данные QA:

```yaml
  "404":
    description: Задача не найдена
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/Error"
        example:
          code: TASK_NOT_FOUND
          message: "Задача 42 не найдена"
```

Хороший тон: примеры есть у каждого ответа, включая ошибки. Разработчик фронта пишет обработку ошибок по примерам, QA берёт их в тесты — не нужно никого спрашивать в чате.

## POST-запрос в спеке

```yaml
  /api/projects/{projectId}/tasks:
    post:
      summary: Создать задачу
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateTaskRequest"
            example:
              title: Купить молоко
              deadline: 2026-12-01
      responses:
        "201":
          description: Задача создана
          headers:
            Location:
              schema:
                type: string
              description: "/api/tasks/{id} созданной задачи"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TaskResponse"
        "400":
          description: "Ошибки валидации (например, пустой title)"
```

Сравните с уроком 4 модуля 1: `201` + `Location` + DTO + `400` — всё, что мы делали в коде, здесь описано как договор. В API-First эта спека пишется **раньше** кода.

## Что из спеки генерируется

Инструменты (openapi-generator, встроенная поддержка в фреймворках):

- **Клиенты**: TypeScript, Java, Python… — типизированные обёртки над HTTP
- **Заготовки сервера**: Java-интерфейсы и DTO, которые бэкенд имплементирует
- **Swagger UI**: страница «попробовать» — запросы прямо из документации
- **Мок-сервер**: отвечает примерами из спеки — фронт работает до готовности бэка

> **💡 Фронтендерам:** сгенерированный TS-клиент — это типы запросов/ответов из спеки. Поменялся контракт — перегенерили клиент — и компилятор сам показал все места, которые надо поправить. Ручные интерфейсы и обёртки больше не нужны.

> **🔧 QA-инженерам:** Swagger UI — готовый «Postman по спеке»: смотрите структуру, отправляете запросы, сверяете ответы. А examples из спеки — согласованное с бэкендом множество тест-данных.

## Итог

- Спека = `info` + `servers` + `paths` + `components/schemas`
- Схемы — переиспользуемые DTO контракта; `$ref` — ссылка на них
- `required`/`minLength`/`format` — валидация, видимая потребителю заранее
- Примеры (`example`) едут в документацию и тесты — заполняйте их всегда
- Из спеки генерятся клиенты, заготовки сервера, Swagger UI и моки

Дальше — правила хорошего тона REST: как называть ресурсы, отдавать ошибки и версионировать API.

## Квиз

```quiz
- type: single
  question: "В спеке у поля id указано format: int64, а у deadline — format: date и nullable: true. Что это сообщает потребителю?"
  options:
    - "id — целое 64-битное число; deadline — дата, которая может отсутствовать"
    - "id и deadline обязательны всегда"
    - "deadline хранится в базе как DATE"
    - "id генерируется автоматически бэкендом"
  correct: 0
  explanation: "Спека описывает контракт, а не хранение: format — тип формата данных по стандарту, nullable — «значения может не быть». Обязательность задаётся отдельно (required), автогенерация id из спеки не следует."

- type: single
  codeLang: yaml
  code: |
    paths:
      /api/tasks/{id}:
        patch:
          requestBody:
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/PatchTaskRequest"
          responses:
            "200": { description: Обновлено }
            "404": { description: Не найдено }
  question: "Что не так с этим фрагментом спеки с точки зрения полноты договора?"
  options:
    - "Не указано, что requestBody обязательно (required: true) — договор допускает PATCH без тела"
    - "YAML с отступами всё сломает"
    - "PATCH нельзя описывать в OpenAPI"
    - "Ссылка $ref ведёт на файл в интернете"
  correct: 0
  explanation: "Без required: true тело формально опционально — и потребитель вправе отправить PATCH без него. Хороший договор двусмысленностей не допускает."

- type: multi
  question: "Зачем в схемах и ответах заполнять example? (несколько ответов)"
  options:
    - "Swagger UI покажет живой пример — документация понятнее"
    - "QA использует примеры как согласованные тест-данные"
    - "Фронтендер пишет обработку ошибок по примерам, не спрашивая в чате"
    - "Примеры заменяют собой описание схем"
  correct: [0, 1, 2]
  explanation: "Примеры — иллюстрации поверх формального описания, а не его замена. Схема остаётся источником правил, пример — образцом."

- type: match
  question: "Сопоставь раздел спеки и его роль."
  pairs:
    - left: "info"
      right: "Название, версия и описание API"
    - left: "paths"
      right: "Эндпоинты: методы, параметры, ответы"
    - left: "components/schemas"
      right: "Переиспользуемые структуры данных"
    - left: "servers"
      right: "Адреса, где живёт API"

- type: blank
  question: "Каким ключевым словом ссылаются на переиспользуемую схему в другом месте спеки? (со значком $)"
  answers:
    - "$ref"
  explanation: "$ref: \"#/components/schemas/Имя\" — ссылка на описанную схему. Описали один раз — используем во всех ответах и запросах."

- type: single
  question: "Команда работает по API-First. Что появится раньше — Java-код контроллера или спека?"
  options:
    - "Спека: её согласуют с потребителями, из неё сгенерят заготовки, код пишется под контракт"
    - "Код: спека генерируется из готового контроллера"
    - "Одновременно — это одно и то же"
    - "Зависит от дня недели"
  correct: 0
  explanation: "В API-First источник правды — спека. Генерация спеки из кода — подход code-first с документацией; он не даёт ревью контракта до реализации."

- type: single
  codeLang: yaml
  code: |
    CreateTaskRequest:
      type: object
      required: [title]
      properties:
        title:
          type: string
          minLength: 1
  question: "Что произойдёт, если клиент отправит {\"title\": \"\"} против такой схемы?"
  options:
    - "Запрос не соответствует контракту: пустой title нарушает minLength — сервер вправе ответить 400"
    - "Сервер обязан создать задачу с пустым названием"
    - "Спека автоматически подставит дефолтное значение"
    - "Ничего: minLength не влияет на валидацию"
  correct: 0
  explanation: "minLength: 1 плюс required — правило контракта: пустая строка невалидна. В Spring то же правило выражается @NotBlank, и ответ — 400."
```
