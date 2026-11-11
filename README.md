# Лаба 1. Контроллер (после урока 4)

Первая лаба с кодом: дописываем REST-контроллер магазина. Проект уже компилируется,
но все эндпоинты возвращают `null` — ваша задача заставить их работать.

Проверка — ручная (автотестов в этой лабе нет): сделали → сравнили с эталонным решением.

## Как начать

```bash
git checkout lab-1
```

Откройте проект в IDEA (или работайте в чём удобно) и найдите все `TODO` — их пять:

| # | Файл | Задача |
|---|---|---|
| 1 | `dto/ProductResponse.java` | Поля DTO ответа: `id`, `title`, `price` |
| 2 | `dto/CreateProductRequest.java` | Поля DTO запроса: `title`, `price` |
| 3 | `ProductMapper.java` | Два метода: `toResponse(Product)` и `toProduct(CreateProductRequest)` — MapStruct сделает остальное |
| 4 | `ProductController.java` | Три эндпоинта: список, по id (404 если нет), создание |
| 5 | `ProductController.java` | POST должен отвечать `201` (аннотация уже стоит — не сломайте) |

Готовые классы (`Product`, `ProductService`, `ProductNotFoundException`) трогать не нужно —
читайте их как пример «чужого» кода по алгоритму из урока 3.

## Требования к API

| Запрос | Ответ |
|---|---|
| `GET /api/products` | `200`, массив `[{id, title, price}, ...]` |
| `GET /api/products/{id}` | `200` и продукт, или `404` если не нашли |
| `POST /api/products` с `{"title":"Кроссовки","price":5990}` | `201` и созданный продукт с `id` |

## Как проверять по ходу

```bash
mvn spring-boot:run
```

В другом терминале:

```bash
curl http://localhost:8080/api/products
curl -X POST http://localhost:8080/api/products \
     -H "Content-Type: application/json" \
     -d '{"title":"Кроссовки","price":5990}'
curl http://localhost:8080/api/products/1
curl http://localhost:8080/api/products/999
```

## Как свериться с решением

Когда всё работает (или застряли надолго):

```bash
git stash            # спрятать свои правки, если не хотите их терять
git checkout lab-1-solution
```

Откройте те же пять файлов, сравните со своими. Вернуться к своей версии:

```bash
git checkout lab-1 && git stash pop
```

Сверка — часть обучения: «как надо красиво» иногда важнее «лишь бы работало».

## Чек-лист

- [ ] Все три эндпоинта отвечают как в таблице
- [ ] `GET /api/products/999` возвращает 404, а не 500 и не пустой 200
- [ ] POST возвращает 201 и присвоенный `id`
- [ ] DTO не содержит лишних полей
- [ ] Вы поняли каждую строчку своего контроллера

Готово — галочка на странице урока 4 и вперёд, к уроку 5.
