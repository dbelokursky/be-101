---
id: m4-order-events
title: Отмена заказа и повтор события
module: 4
moduleTitle: "Kafka вглубь"
order: 1.5
baseOrder: 8
---

# Отмена заказа и повтор события

В срезе на `11:59:53Z` заказ `42` уже отменён. Уведомление об отмене создаётся отдельным обработчиком. Посмотри, когда он получил событие и что произошло после перезапуска.

## Сообщение в Kafka

В учебном журнале все отметки относятся к 16 января и указаны в UTC. Брокер получил одно сообщение об отмене.

```text
11:59:52.410Z append topic=orders.cancelled partition=1 offset=803 key=42
```

```json
{
  "eventId": "evt-order-42-cancel",
  "orderId": 42,
  "occurredAt": "2026-01-16T11:59:52.180Z",
  "type": "orders.cancelled"
}
```

Ключ `42` помогает направить события заказа в одну партицию. `eventId` обозначает логическое событие. По `partition` и `offset` можно найти конкретную запись в топике.

## Журнал обработчика

К `11:59:55Z` в таблице `notifications` ещё нет записи по событию. Позже обработчик читает сообщение и фиксирует результат в БД. После сбоя Kafka отдаёт ему ту же запись повторно.

```text
11:59:57.010Z received   eventId=evt-order-42-cancel orderId=42 partition=1 offset=803
11:59:57.060Z committed notificationId=notice-42 eventId=evt-order-42-cancel
11:59:57.074Z stopped   nextOffset=803
12:00:01.300Z received   eventId=evt-order-42-cancel orderId=42 partition=1 offset=803
12:00:01.310Z duplicate eventId=evt-order-42-cancel notificationId=notice-42
12:00:01.320Z offset_commit partition=1 nextOffset=804
```

Группа хранила `803` как позицию следующего чтения. После остановки новый экземпляр снова прочитал запись `803`. Сохранённый результат с тем же `eventId` позволил завершить обработку, сохранив одну строку `notice-42`. Проверка эффекта ищет строку в `notifications` по `event_id = 'evt-order-42-cancel'`.

Возврат бонусов входит в транзакцию отмены. Обработчик уведомлений делает свою работу позже. Статус заказа, запись возврата и уведомление можно проверить по отдельности.

## Дополнительная практика в Java

В [эталоне лабы 6](https://github.com/dbelokursky/be-101/tree/lab-6-solution) добавь метод ниже в `Lab6KafkaTest` и запусти `mvn test`. В этой лабе учебный потребитель складывает входящие события `orders.created` в список.

```java
@Test
void repeatedPayloadReachesConsumerTwice() throws Exception {
    consumer.clear();
    OrderCreatedEvent event = new OrderCreatedEvent(42L, "ann", BigDecimal.ONE);

    var first = kafkaTemplate.send("orders.created", "42", event).get().getRecordMetadata();
    var second = kafkaTemplate.send("orders.created", "42", event).get().getRecordMetadata();

    await(() -> consumer.received().size() == 2);
    assertEquals(java.util.List.of(event, event), consumer.received());
    assertEquals(first.partition(), second.partition());
    assertEquals(first.offset() + 1, second.offset());
}
```

Две публикации одинакового содержимого получают разные offset. В журнале отмены обработчик перечитал один offset. В обоих случаях обработчик может получить один логический факт дважды.

## Квиз

```quiz
- type: single
  question: "В 11:59:55Z уведомления для заказа 42 ещё нет. По каким данным проверить, отменён ли заказ?"
  options:
    - "По статусу заказа и записи возврата в БД"
    - "По числу строк в таблице notifications"
    - "По зафиксированному offset группы уведомлений"
    - "По числу повторных попыток прочитать событие"
  correct: 0
  explanation: "К этому времени отмена и возврат уже есть в БД. Уведомление обрабатывается отдельным сервисом."

- type: single
  question: "Какое наблюдение в журнале показывает повторное чтение той же записи Kafka?"
  options:
    - "Совпадают партиция, offset и eventId у двух строк received"
    - "Совпадает только orderId у двух строк received"
    - "Следующая позиция после обработки стала 804"
    - "У следующих сообщений разные ключи"
  correct: 0
  explanation: "Пара partition и offset указывает на запись в топике. Одинаковый eventId связывает обе попытки с одним бизнес-событием."

- type: single
  question: "Чем проверить, сколько уведомлений было создано для evt-order-42-cancel?"
  options:
    - "Посчитать сохранённые строки notifications по event_id"
    - "Посчитать строки received в журнале консюмера"
    - "Вычесть предыдущий offset из следующего"
    - "Посчитать все записи возврата бонусов"
  correct: 0
  explanation: "Две строки received показывают число доставок. Одна сохранённая строка notice-42 показывает эффект обработчика."

- type: single
  question: "У двух сообщений один orderId и разные eventId. Можно ли по ключу заказа объявить второе сообщение повтором?"
  options:
    - "Для вывода нужен идентификатор логического события. У заказа могут происходить разные события"
    - "Да, ключ заказа единственный для всех его бизнес-событий"
    - "Да, достаточно одинаковой партиции"
    - "Нет, нужно удалить offset группы"
  correct: 0
  explanation: "Ключ определяет маршрутизацию сообщения. В этом сценарии обработчик отслеживает повторы по eventId."

- type: match
  question: "Свяжи наблюдение с тем, что оно подтверждает."
  pairs:
    - left: "orders.status = CANCELLED"
      right: "Транзакция отмены сохранила состояние заказа"
    - left: "refund-42"
      right: "В журнале бонусов есть возврат по отмене"
    - left: "notice-42"
      right: "Обработчик создал запись уведомления"
  explanation: "Каждая запись свидетельствует о своём этапе. Для проверки всего сценария собирают несколько источников по одному заказу."
```
