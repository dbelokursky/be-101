# Лаба 7. Свои метрики (после модуля «Наблюдаемость»)

Финальная лаба курса: превратить факт «заказ создан» в число на дашборде.
Бизнес-счётчик и таймер в сервисе, проверка — через `/actuator/metrics`,
ровно как их увидит Prometheus.

## Как начать

```bash
git checkout lab-7
mvn test
```

Тесты красные: метрик с именами `orders.created.total` и `orders.create.time`
в приложении нет. Готовое: контроллер, домен, конфиг актуатора. TODO — один файл:
`order/OrderService.java`.

| # | Метрика | Тип | Смысл |
|---|---|---|---|
| 1 | `orders.created.total` | Counter | Сколько заказов создано |
| 2 | `orders.create.time` | Timer | Как долго создаётся заказ |

## Подсказки

- Поля `Counter` и `Timer` + конструктор с `MeterRegistry` — урок 2 модуля
- Счётчик: `ordersCreated.increment()` после создания заказа
- Таймер: `long start = System.nanoTime()` в начале метода,
  `createTimer.record(System.nanoTime() - start, TimeUnit.NANOSECONDS)` — в конце

## Проверить руками

```bash
mvn spring-boot:run
curl -X POST http://localhost:8080/api/orders -H "Content-Type: application/json" \
     -d '{"customer":"ann","amount":"1990"}'
curl http://localhost:8080/actuator/metrics/orders.created.total
```

В ответе — `measurements[0].value`: количество заказов. Именно этот JSON
забирает Prometheus каждые 15–30 секунд.

## Сверка с решением

```bash
git stash && git checkout lab-7-solution
mvn test          # 3/3 зелёные
git checkout lab-7 && git stash pop
```

## Чек-лист

- [ ] `mvn test` — 3 из 3 зелёные
- [ ] Вы понимаете разницу Counter/Timer и почему id заказа НЕ стал тегом
- [ ] Вы нашли свои метрики в `/actuator/metrics` руками

Это последняя лаба курса BE-101. Все пять модулей пройдены! 🎓
