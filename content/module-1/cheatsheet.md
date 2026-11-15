---
id: m1-cheatsheet
title: "Шпаргалка модуля"
module: 1
moduleTitle: "Spring Boot: бэкенд с нуля"
order: 7
---

# Шпаргалка: Spring Boot с нуля

## HTTP за 30 секунд

| Метод | Семантика | Тело | Успех |
|---|---|---|---|
| GET | Прочитать | — | 200 |
| POST | Создать | JSON | **201 + Location** |
| PUT | Заменить целиком | JSON | 200 |
| PATCH | Изменить часть | JSON | 200 |
| DELETE | Удалить | — | **204** (без тела) |

| Код | Значение |
|---|---|
| 200 / 201 / 204 | OK / создано / без содержимого |
| 301 | Редирект |
| 400 / 401 / 403 / 404 | Кривой запрос / «не знаю кто» / «нельзя» / «нет такого» |
| 5xx | Вина сервера (в логи!) |

`Content-Type: application/json` — и в запросе, и в ответе. Query-параметры после `?` — фильтры и пагинация.

## Слои приложения

| Слой | Делает | Не делает |
|---|---|---|
| Контроллер | HTTP ↔ Java, валидация, статусы | Бизнес-правила, SQL |
| Сервис | Бизнес-логика, `@Transactional` | Не знает про HTTP |
| Репозиторий | Чтение/запись данных | Не решает бизнес |
| БД | Хранит | Не считает скидки |

## Аннотации контроллера

```java
@RestController @RequestMapping("/api/products")
@GetMapping @PostMapping @PatchMapping @DeleteMapping
@PathVariable Long id            // из пути /{id}
@RequestBody CreateProductRequest // JSON-тело → объект
@Valid @NotBlank @NotNull         // валидация → 400
@ResponseStatus(HttpStatus.CREATED)
```

## Java одним взглядом

- Деньги — `BigDecimal`, не `double`
- `Optional<T>` = «может не быть»: `map()`, `orElse()`, `orElseThrow()`
- `@Аннотации` — метки для фреймворков; Lombok (`@Getter`, `@Builder`) генерирует код
- `interface` = контракт, `Impl` = реализация; связывает Spring (DI)
- Чтение чужого файла: аннотации → поля → публичные методы

## Наблюдаемость (касанием)

- `/actuator/health` — жив ли (UP/DOWN), его опрашивают пробы
- `/actuator/metrics` — числа; Micrometer — фасад метрик

## Конфиг

```yaml
server.port: 8080            # дефолтный порт
spring.datasource.url: ...   # база
profiles: dev / prod         # один код, разные окружения
```

Секреты — в переменных окружения, не в git.
