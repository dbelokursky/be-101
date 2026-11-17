---
id: m6-lesson-04
title: "Testcontainers: честная база"
module: 6
moduleTitle: "Тесты на бэкенде"
order: 4
---

# Урок 4. Testcontainers: честная база

H2 хороша, пока не наступает момент, когда «тесты зелёные, прод красный». Диалекты SQL, блокировки, EXCLUDE-ограничения из кейса модуля 3, поведение миграций — всё это H2 не воспроизводит: это **другая СУБД**. Честное решение — поднимать настоящую базу в Docker на время теста.

## Идея одной строкой

**Testcontainers** стартует Docker-контейнер (PostgreSQL, Kafka, Redis…) из JUnit-теста, приложение подключается к нему как к обычной базе, контейнер умирает вместе с тестом. В CI — тот же Docker, те же тесты.

```java
@Testcontainers
@SpringBootTest
class TaskRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private TaskRepository taskRepository;

    @Test
    void uniqueConstraintWorks() {
        taskRepository.save(new Task("dup", 7L));
        assertThatThrownBy(() -> taskRepository.save(new Task("dup", 7L)))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

Разбор:

- `@Container` + `static` — контейнер **один на класс** (не на тест!): стартует секунды — бережём их
- `@ServiceConnection` — Spring Boot сам подставляет host/port/логин контейнера в `spring.datasource` (без ручных `@DynamicPropertySource`)
- При старте контекста Liquibase накатит миграции **на настоящий PostgreSQL** — заодно проверяются миграции

## Что это ловит, а H2 — нет

| Проверка | H2 | Postgres-контейнер |
|---|---|---|
| CRUD, маппинги, статусы | ✓ | ✓ |
| Диалект SQL (`ON CONFLICT`, `tsrange` из кейса М3) | ✗ | ✓ |
| Уникальность/FK/EXCLUDE-ограничения по-настоящему | частично | ✓ |
| Блокировки и уровни изоляции в гонках | ✗ | ✓ |
| Миграции Liquibase на целевой СУБД | ~ | ✓ |

Правило выбора простое: **H2 — быстрая петля разработки; Testcontainers — то, что обязательно в CI** для репозиториев, миграций и всего, где поведение зависит от СУБД.

## Kafka и брокеры — тоже контейнеры

Асинхронные тесты на живом брокере без Docker-церемоний:

```java
KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("apache/kafka:3.9.0"));
```

Правда, для юнит-цикла «продюсер-листенер» часто хватает и `@EmbeddedKafka` (как в лабе 6: брокер прямо в JVM). Баланс: embedded — быстрее и без Docker; контейнер — тот же Kafka, что в проде.

## Цена и гигиена

- **Скорость**: контейнер стартует секунды → один статический контейнер на класс/модуль, никаких «на каждый тест»
- **Docker обязателен** на машине разработчика и в CI — главный организационный нюанс
- **Именование**: `*IT` (Integration Test) вместо `*Test` — часто выделяют в отдельную фазу Maven (failsafe): юниты — на каждый коммит, IT — перед мержем
- Пул соединений на старте: контейнер должен быть готов (`wait strategy`) — Testcontainers делает это сам по healthcheck

## Итог

- Testcontainers = настоящий PostgreSQL/Kafka/… в Docker на время теста; CI — тот же Docker
- `@Container` + `static` + `@ServiceConnection`: один контейнер на класс, автоподключение
- Ловит то, что H2 не может: диалект, ограничения, блокировки, миграции целевой СУБД
- H2 — быстрая петля; Testcontainers — обязателен в CI для данных
- EmbeddedKafka vs Kafka-контейнер: скорость против «как в проде»

Следующий урок — контрактные тесты и как всё это собирается в CI-конвейер.

## Квиз

```quiz
- type: single
  question: "Тест на EXCLUDE-ограничение (запрет пересечения брони) зелёный на H2 и пропускает баг на проде. Почему?"
  options:
    - "H2 — другая СУБД: она не поддерживает EXCLUDE-конструкцию PostgreSQL так, как прод; проверять надо настоящим PostgreSQL"
    - "Тест написан на Java"
    - "Прод-база больше"
    - "Liquibase не работает с H2"
  correct: 0
  explanation: "Диалектные особенности — зона H2-слепоты. Контейнер с той же версией PostgreSQL воспроизводит поведение прода."

- type: multi
  question: "Зачем контейнер объявляют static и один на класс? (несколько ответов)"
  options:
    - "Старт контейнера — секунды: один на всех тестов класса экономит время"
    - "Статический контейнер живёт всю фазу тестов класса, а не клонируется на каждый метод"
    - "Без static Docker не запустится"
    - "Это ускоряет сам PostgreSQL"
  correct: [0, 1]
  explanation: "Гигиена скорости. Перс-тестовый контейнер умножил бы минуты на количество методов."

- type: single
  codeLang: java
  code: |
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");
  question: "Что делает @ServiceConnection?"
  options:
    - "Spring подставляет host/port/учётку контейнера в spring.datasource — без ручной настройки свойств"
    - "Создаёт схему Liquibase"
    - "Включает транзакции в тестах"
    - "Подключает Kafka"
  correct: 0
  explanation: "Раньше писали @DynamicPropertySource руками; теперь Boot связывает контейнер с конфигурацией приложения автоматически."

- type: match
  question: "Сопоставьте задачу и инструмент."
  pairs:
    - left: "Быстрая петля разработки CRUD"
      right: "H2 in-memory"
    - left: "Проверка миграций на целевой СУБД"
      right: "Testcontainers: PostgreSQL"
    - left: "Цикл продюсер→листенер без Docker"
      right: "@EmbeddedKafka"
    - left: "«Тот же Kafka, что в проде»"
      right: "Kafka-контейнер"

- type: single
  question: "В командном CI юниты гоняют на каждый коммит, а Testcontainers-тесты — перед мержем. Почему это разумно?"
  options:
    - "Стоимость/ценность: контейнеры медленнее — их вес оправдан на более поздней, редкой фазе; юнит-петля остаётся мгновенной"
    - "Testcontainers не работают на каждый коммит"
    - "Юниты важнее"
    - "Docker запускается только по расписанию"
  correct: 0
  explanation: "Классическая лестница CI: мгновенные проверки каждому коммиту, тяжёлые интеграционные — перед мержем. Разделение часто оформляют failsafe-плагином (*IT)."

- type: blank
  question: "Каким суффиксом принято помечать интеграционные тесты, чтобы отделить их от юнит-прогона? (две латинские буквы)"
  answers:
    - "IT"
    - "it"
  explanation: "*IT (Integration Test): Maven surefire гоняет *Test, failsafe — *IT. Конвенция, по которой CI разделяет фазы."

- type: single
  question: "У разработчика нет Docker локально. Что он теряет?"
  options:
    - "Локальный запуск Testcontainers-тестов (упадут на старте контейнера) — их поймает CI; H2-петля и юниты остаются рабочими"
    - "Все тесты перестают компилироваться"
    - "Ничего: Docker нужен только в проде"
    - "Возможность писать юнит-тесты"
  correct: 0
  explanation: "Юниты и MockMvc+H2 не требуют Docker. Контейнерные проверки сместятся в CI — осознанный компромисс команды."
```
