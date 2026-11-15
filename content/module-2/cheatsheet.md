---
id: m2-cheatsheet
title: "Шпаргалка модуля"
module: 2
moduleTitle: "Проектирование API"
order: 7
---

# Шпаргалка: Проектирование API

## Два подхода

| | Code-first | API-First |
|---|---|---|
| Сначала | Код | Контракт (OpenAPI) |
| Ревью | Кода (контракт «случился») | Контракта всеми ролями |
| Фронт ждёт бэка | Да | Нет: мок-сервер + генерация клиента |

## Скелет OpenAPI

```yaml
info:    # название, версия
servers: # где живёт
paths:   # эндпоинты: методы, параметры, ответы
components:
  schemas:   # переиспользуемые DTO; ссылка — $ref
```

Обязательно: `required` у requestBody, ответы 4xx с `example` (с машинным `code`),
`example` у схем — это тест-данные для QA и фрона.

## REST-практики

- Ресурсы — существительные: `GET /api/tasks`, `POST /api/orders`
- Действие вне CRUD: `POST /api/orders/42/cancellations` (или `/cancel` — прагматично)
- Пагинация: `?limit=20&offset=40` или cursor; фильтры — query
- Ошибки — единым форматом (Problem Details): машина — по `status`+`code`, человек — по `title/detail`
- POST не идемпотентен → `Idempotency-Key` для критичных операций

## Обратная совместимость

| Совместимо ✓ | Breaking ✗ |
|---|---|
| Новое поле в ответе | Удалить/переименовать поле |
| Новый эндпоинт | Сменить тип поля |
| Новый необязательный параметр | Изменить смысл |

Breaking → новая версия (`/v2`) + `Deprecation`/`Sunset` + переезд по метрике.

## GraphQL за 30 секунд

```graphql
type Query { tasks(done: Boolean): [Task!]! }   # сервер описал схему
query { tasks(done: false) { title project { name } } }  # клиент заказал
```

- Лечит over-fetching и N+1 на стороне клиента; один эндпоинт `/graphql`
- Минусы: POST → HTTP-кэш мимо; серверу сложнее
- В Spring: `@QueryMapping` / `@MutationMapping` поверх того же сервиса

## Процесс в команде

Черновик спеки → ревью (аналитик: семантика, фронт: поля, QA: ошибки) → мок+клиент
→ реализация → контрактные тесты в CI → changelog.
