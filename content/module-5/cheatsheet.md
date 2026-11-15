---
id: m5-cheatsheet
title: "Шпаргалка модуля"
module: 5
moduleTitle: "Наблюдаемость"
order: 7
---

# Шпаргалка: Наблюдаемость

## Три столпа

| Столп | Вопрос | Инструмент |
|---|---|---|
| Метрики | Сколько / как быстро / как часто падает | Micrometer → Prometheus → Grafana |
| Логи | Что именно случилось | JSON-логи, уровни |
| Трейсы | Где в цепочке | traceId, OpenTelemetry, span'ы |

## Micrometer

```java
Counter.builder("orders.created.total").tag("service","orders").register(registry);  // сколько раз
Gauge.builder("orders.pending", store, s -> s.count()).register(registry);           // сколько сейчас
Timer.builder("orders.create.time").register(registry);                              // как долго → p99
```

- Теги — конечные оси (method, status); `userId` в тегах = кардинальность убьёт Prometheus
- Доли (error rate) считаются на дашборде из счётчиков, не в коде
- Путь: код → `/actuator/metrics` → Prometheus (pull) → Grafana

## Золотые сигналы дашборда дежурного

**Traffic** (RPS) · **Latency** (p99, не среднее!) · **Errors** (5xx) · **Saturation** (пулы, **лаг групп**, **глубина DLT**)

## Логи

| Уровень | Смысл |
|---|---|
| ERROR | Нужен человек (шум = смерть алертов) |
| WARN | Странно, но обработано |
| INFO | Факты жизни |
| DEBUG | Детали (off в проде) |

- JSON-структура: поля читает машина (`orderId=42 AND level=ERROR`)
- **MDC + traceId**: фильтр на входе HTTP, заголовок в Kafka-событии, MDC в листенере
- Никогда: пароли, токены, карты, «тела целиком»

## Алерты и SLO

- Алерт = **симптом** + время горения + адресат + runbook («error_rate > 1% 10 мин», не «CPU 80%»)
- SLO: «99.9% успешны за 30 дней» → бюджет ошибок → алерты по темпу сгорания
- Сработал алерт — есть действие; «привыкли» — переделать алерт

## Чек-лист production-ready

- [ ] Контракт: OpenAPI, версии, deprecation
- [ ] Данные: Liquibase, индексы, идемпотентность
- [ ] Асинхронность: ключи, outbox, DLT, лаг под контролем
- [ ] Наблюдаемость: сигналы + бизнес-метрики + traceId + алерты по симптомам
