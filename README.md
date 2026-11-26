# Лаба 10. Capstone: сервис заказов целиком (выпускной проект)

Финальная лаба курса: собрать **всё** своими руками. Никаких новых TODO-заглушек в коде —
перед вами чистый проект с готовой обвязкой и приёмными тестами, проверяющими весь курс:
REST-контракт, валидацию, персистентность через Liquibase, событие в Kafka и бизнес-метрику.

Готовое (не трогать): `Lab10Application`, `OrderCreatedEvent`, `KafkaConfig`
(типизированный KafkaTemplate — как в лабе 6), Liquibase-схема `orders`,
`application.yml` (H2 + validate + Kafka-сериализация + actuator), `CapstoneTest`.

## Что построить (контракт = тесты)

**Требования к API:**

| Запрос | Ответ |
|---|---|
| `POST /api/orders` `{"customer":"ann","amount":"1990"}` | `201`, тело: `id`, `customer`, `amount`, `status:"NEW"` |
| `GET /api/orders` | `200`, список сохранённых заказов |
| Пустой `customer` или отрицательный `amount` | `400` |
| `GET /actuator/health` | `UP` (уже работает) |

**Побочные эффекты создания заказа (проверяет приёмник):**
- строка в таблице `orders` (Liquibase уже создал схему; `ddl-auto: validate` сверит вашу entity)
- событие `OrderCreatedEvent` в topic `orders.created` с ключом = id заказа
- метрика `orders.created.total` растёт (`/actuator/metrics`)

## План сборки (по модулям курса)

1. **Entity** `Order` под таблицу `orders` (модуль «Данные»): id/customer/amount/status
2. **Repository** `OrderRepository extends JpaRepository` (модуль 1)
3. **DTO**: `CreateOrderRequest` с `@NotBlank customer` и `@Positive amount`; `OrderResponse` (модуль 2)
4. **Mapper** `OrderMapper` (MapStruct, `componentModel = "spring"`) — модуль 1
5. **Service** `OrderService`: сохранить → отправить событие → инкрементнуть
   `Counter orders.created.total` (Micrometer, модуль «Наблюдаемость») — всё внутри `@Transactional`
6. **Controller** `OrderController`: POST `201` (`@Valid`!), GET список

Порядок свободный, но идти снизу вверх (entity → репозиторий → …) — наименьшее трение.

## Запись заказа и отправка в Kafka

В учебном решении Kafka получает событие из метода с `@Transactional`. Коммит
БД и подтверждение Kafka происходят независимо. Брокер может принять событие
до отката БД. Заказ также может сохраниться, если асинхронная отправка завершится
ошибкой. Приёмник проверяет публикацию в успешном сценарии.

В [уроке про dual-write](https://dbelokursky.github.io/be-101/#/m4-lesson-03)
разобраны оба случая. В
[уроке про transactional outbox](https://dbelokursky.github.io/be-101/#/m4-lesson-05)
заказ и запись для публикации сохраняются в одной транзакции БД. Отдельный
обработчик отправляет событие в Kafka после коммита.

## Как проверять

```bash
git checkout lab-10
mvn test
```

Сейчас 5 из 6 красные (эндпоинтов нет). Health уже зелёный. Погнали: каждый
закрытый тест — закрытый модуль курса.

## Сверка с решением

```bash
git stash && git checkout lab-10-solution
mvn test          # 6/6 зелёные
git checkout lab-10 && git stash pop
```

## Чек-лист выпускника BE-101

- [ ] `mvn test` — 6 из 6 зелёные
- [ ] Вы можете объяснить каждый слой своего сервиса и почему он там
- [ ] Вы знаете, где в вашем коде контракт, где данные, где событие, где метрика

Это последний шаг курса. После него — финальный экран, тренажёр и настоящие таски в репо команды. 🎓
