# Лаба 6. Продюсер и консюмер (после модуля «Kafka вглубь»)

Полный цикл события своими руками: REST-запрос → публикация `orders.created` →
приём в `notification-service`. Брокер поднимается **внутри тестов**
(EmbeddedKafka) — Docker не нужен, а контур настоящий.

## Как начать

```bash
git checkout lab-6
mvn test
```

Тесты красные: события никто не публикует и никто не слушает. Готовое:
контроллер, домен, событие, конфиг сериализации. TODO — два файла:

| # | Файл | Задача |
|---|---|---|
| 1 | `order/OrderService.java` | Внедрить `KafkaTemplate<String, OrderCreatedEvent>` и опубликовать событие с ключом `orderId` в `orders.created` |
| 2 | `notification/NotificationConsumer.java` | Превратить в слушателя: `@KafkaListener(topics = "orders.created", groupId = "notification-service")` |

## Подсказки

- Конструктор сервиса: добавьте параметр `KafkaTemplate<String, OrderCreatedEvent>` — Spring подставит сам
- Отправка: `kafkaTemplate.send("orders.created", String.valueOf(order.id()), new OrderCreatedEvent(...))`
- Листенер: метод `onOrderCreated(OrderCreatedEvent event)` с аннотацией; внутри — `received.add(event)`
- Конфиг уже готов: JSON-сериализация, группа, `auto-offset-reset: earliest`

## Что проверяют тесты

1. **Ручная отправка доходит** — цикл KafkaTemplate → брокер → листенер работает
2. **POST /api/orders публикует событие** — сервис обязан отправить факт
3. **Порядок событий одного ключа** — оба события ключа `42` приходят по порядку
   (2 партиции: порядок держится именно благодаря ключу — урок 2)

## Сверка с решением

```bash
git stash && git checkout lab-6-solution
mvn test          # 3/3 зелёные
git checkout lab-6 && git stash pop
```

## Чек-лист

- [ ] `mvn test` — 3 из 3 зелёные
- [ ] Вы можете объяснить: где здесь продюсер, где консюмер, что такое groupId
- [ ] Вы знаете, почему ключ события — это id заказа

Модуль «Kafka вглубь» закрыт полностью.
