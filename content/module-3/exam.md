---
id: m3-exam
title: Экзамен модуля и кейс
module: 3
moduleTitle: "Данные"
order: 6
---

# Экзамен модуля «Данные»

Пять уроков: SQL-фундамент, entity-связи, N+1, транзакции, миграции. Схема финала та же: сначала кейс своими словами, потом 15 вопросов, порог 80%.

## Кейс

```case
title: "Спроектируйте схему данных для бронирования переговорок"
task: "Та же предметная область, что в кейсе модуля 2, но теперь — изнутри: спроектируйте СХЕМУ БАЗЫ. Известно: переговорки (номер/имя, вместимость, проектор), сотрудники (логин), брони (комната, кто, интервал времени, статус). Подумайте: какие таблицы и связи (один-ко-многим/многие-ко-многим)? Где первичные и внешние ключи? Какой индекс поставите под запрос «свободные слоты комнаты на день»? Как на уровне БД не дать двойного бронирования? Опишите таблицами: имя → колонки (имя, тип, ограничения) → связи. Форма свободная."
placeholder: "Например:\nrooms: id PK, name, capacity...\nbookings: id PK, room_id FK, ..."
reference: |
  Один из возможных ответов.

  ## Таблицы

  **rooms**: `id BIGINT PK`, `name VARCHAR(100) NOT NULL`, `capacity INT NOT NULL CHECK (capacity > 0)`, `projector BOOLEAN NOT NULL DEFAULT false`

  **employees**: `id BIGINT PK`, `login VARCHAR(50) NOT NULL UNIQUE`

  **bookings**: `id BIGINT PK`, `room_id BIGINT NOT NULL FK → rooms.id`,
  `employee_id BIGINT NOT NULL FK → employees.id`,
  `starts_at TIMESTAMP NOT NULL`, `ends_at TIMESTAMP NOT NULL`,
  `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` (ACTIVE/CANCELLED),
  `CHECK (starts_at < ends_at)`

  ## Связи

  - rooms → bookings: один-ко-многим (FK на стороне броней — их много на комнату)
  - employees → bookings: один-ко-многим (FK у броней)
  - Многие-ко-многим (участники встречи): при необходимости `booking_attendees(booking_id FK, employee_id FK)` с составным PK

  ## Индексы

      CREATE INDEX idx_bookings_room_time ON bookings (room_id, starts_at);
      -- запрос «слоты комнаты на день» = WHERE room_id = ? AND starts_at < конец дня AND ends_at > начало дня

  Индекс по паре (room_id, starts_at) закрывает горячий запрос поиска пересечений.

  ## Защита от двойного бронирования

  Вариант 1 — исключающее ограничение (PostgreSQL):

      ALTER TABLE bookings ADD CONSTRAINT excl_no_overlap
        EXCLUDE USING gist (
          room_id WITH =, tsrange(starts_at, ends_at) WITH &&
        ) WHERE (status = 'ACTIVE');

  База сама отклонит пересекающиеся активные брони → приложению остаётся отдать 409.

  Вариант 2 — без EXCLUDE: `SELECT ... FOR UPDATE` по комнате в транзакции + проверка пересечений перед INSERT (пессимистичная блокировка из урока 4).

  ## Связь с контрактом API

  Схема — не копия DTO из кейса модуля 2: API отдаёт Booking с bookedBy (логин), а в базе — employee_id FK. Маппинг между ними — MapStruct-маппер. Контракт — для потребителей, схема — для целостности.
```

## Экзамен

```quiz
- type: single
  question: "Колонка tasks.project_id ссылается на projects.id. Что защищает FOREIGN KEY?"
  options:
    - "Нельзя вставить задачу с project_id, которого нет в projects"
    - "Нельзя удалить проект — никогда и ни при каких условиях"
    - "Запросы по project_id всегда быстрые"
    - "Таблицы шифруются"
  correct: 0
  explanation: "FK — ссылочная целостность на вставку/обновление. Удаление проекта с задачами СУБД запретит или каскадно обработает — по правилу ON DELETE, которое задаётся отдельно."

- type: single
  codeLang: sql
  code: |
    SELECT p.name, COUNT(t.id) AS open_cnt
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id AND t.done = false
    GROUP BY p.name;
  question: "Чем этот запрос отличается от INNER JOIN с тем же условием?"
  options:
    - "LEFT JOIN вернёт и проекты без открытых задач (со значением 0), INNER — только проекты, где они есть"
    - "Ничем: JOIN всегда одинаковый"
    - "LEFT JOIN не поддерживает условие в ON"
    - "INNER JOIN быстрее всегда"
  correct: 0
  explanation: "LEFT JOIN сохраняет левую сторону: проектов без пары COUNT(t.id) посчитает 0. INNER JOIN выкинет их. «Отчёт, где исчезли пустые проекты» — типичный баг замены JOIN'а."

- type: multi
  question: "Признаки N+1 в приложении? (несколько ответов)"
  options:
    - "В SQL-логах лес однотипных SELECT ... WHERE id = ? / project_id = ?"
    - "Эндпоинт замедляется пропорционально числу записей"
    - "Локально быстро, на проде с большими данными — медленно"
    - "База занимает мало места"
  correct: [0, 1, 2]
  explanation: "N+1 — линейная зависимость числа запросов от данных. Три симптома вместе — почти диагноз; подтверждается статистикой Hibernate или счётчиком запросов."

- type: single
  question: "Какой запрос решит «проекты с количеством задач» за одну поездку в базу, не грузя задачи?"
  options:
    - "Проекция: select p.name, count(t) from Project p left join p.tasks t group by p.name"
    - "findAll() проектов + getSize() по задачам с JOIN FETCH"
    - "findAll() и цикл с getTasks().size()"
    - "Кэш всех задач в памяти приложения"
  correct: 0
  explanation: "Считать должна база: агрегат с GROUP BY вернёт готовые цифры. JOIN FETCH здесь даже вреден — он тащит все задачи, чтобы их посчитать в Java."

- type: single
  codeLang: java
  code: |
    @Transactional
    public void complete(Long id) {
        Task task = taskRepository.findById(id).orElseThrow();
        task.setDone(true);
        // save() не вызывается
    }
  question: "Сохранится ли done = true в базе после завершения метода?"
  options:
    - "Да: dirty checking внутри транзакции сам сгенерирует UPDATE при коммите"
    - "Нет: без save() изменения потеряются"
    - "Только если task был загружен в другом методе"
    - "Зависит от версии Hibernate"
  correct: 0
  explanation: "Managed-entity в открытой сессии сравнивается со снимком; изменённое поле даёт UPDATE при коммите. Явный save() для управляемых сущностей не нужен."

- type: single
  question: "@ManyToOne со значением EAGER: чем опасно?"
  options:
    - "Связанная сущность грузится всегда и везде, раздувая каждый запрос и цепляясь каскадом дальше"
    - "EAGER ломает компиляцию"
    - "EAGER отключает индексы"
    - "Ничем: это значение по умолчанию, значит безопасно"
  correct: 0
  explanation: "Дефолт — не синоним «правильно». EAGR тянет связь даже там, где не просят; ставьте LAZY и догружайте точечно (FETCH/EntityGraph)."

- type: blank
  question: "Какое исключение получит код, обратившийся к ленивой связи ПОСЛЕ закрытия транзакции? (три слова, Latent... нет — просто назовите: LazyInitialization...)"
  answers:
    - "LazyInitializationException"
    - "lazyinitializationexception"
  explanation: "LazyInitializationException: прокси не может догрузить данные в закрытой сессии. Лечение — загрузить связь внутри транзакции."

- type: single
  question: "Две транзакции параллельно уменьшают остаток (qty=1) обычным «прочитал-проверил-записал». Сколько товара будет продано?"
  options:
    - "Два — каждая транзакция видела остаток 1 и прошла успешно: классическая гонка"
    - "Один: Postgres не позволит вторую"
    - "Ноль: обе откатятся"
    - "Зависит от уровня READ UNCOMMITTED"
  correct: 0
  explanation: "READ COMMITTED не сериализует «прочитал-проверил-записал». Нужны SELECT FOR UPDATE, @Version или атомарный UPDATE с WHERE qty > 0."

- type: match
  question: "Сопоставьте инструмент борьбы с гонкой и его поведение."
  pairs:
    - left: "PESSIMISTIC_WRITE"
      right: "Строка блокируется: конкурент ждёт освобождения"
    - left: "@Version (оптимистичная)"
      right: "Конфликт ловится при UPDATE: исключение и повтор"
    - left: "Атомарный UPDATE с условием"
      right: "База сама решает: обновилось 0 строк — не вышло"
    - left: "Thread.sleep перед записью"
      right: "Не решение: гонка остаётся"

- type: single
  question: "Метод @Transactional сделал UPDATE и выбросил NullPointerException. Что в базе?"
  options:
    - "Ничего: RuntimeException → откат транзакции"
    - "UPDATE останется: коммит уже прошёл"
    - "UPDATE останется наполовину"
    - "База заблокируется"
  correct: 0
  explanation: "Атомарность: unchecked-исключение откатывает всё, что сделано в методе. Для checked по умолчанию — коммит (вопрос из урока 4)."

- type: multi
  question: "Что верно про changeset'ы Liquibase? (несколько ответов)"
  options:
    - "Применённый changeset нельзя редактировать: чек-сумма в DATABASECHANGELOG не совпадёт"
    - "Новое изменение схемы = новый changeset"
    - "Changeset можно безопасно править сколько угодно после применения"
    - "Changeset применяется один раз — это гарантирует таблица changelog"
  correct: [0, 1, 3]
  explanation: "Редактирование применённого changeset'а — способ уронить старт приложения на проде. История неизменна, изменения только добавляются."

- type: single
  question: "Безопасный способ убрать колонку, которую ещё читает работающий код?"
  options:
    - "Expand-contract: сначала новый вариант схемы и запись в оба места, потом выкатка кода без старой колонки, потом удаление"
    - "Удалить сразу: если упадёт — вернём откатом"
    - "Переименовать колонку: rename безопаснее delete"
    - "Отключить приложение на время удаления"
  correct: 0
  explanation: "Окно несовместимости должно быть пустым. «Упадёт — откатим» на проде с данными — не стратегия, а инцидент."

- type: single
  question: "Что делает ddl-auto: validate в связке с Liquibase?"
  options:
    - "Проверяет соответствие entity схеме при старте: расхождение — приложение не поднимется"
    - "Создаёт схему по entity"
    - "Удаляет схему перед стартом"
    - "Ничего: это синоним для none"
  correct: 0
  explanation: "Схемой управляет Liquibase, а validate ловит расхождение между кодом и базой на старте — ранняя, громкая ошибка вместо тихого рантайма."

- type: blank
  question: "Как называется подход к интеграционным тестам, поднимающий настоящую PostgreSQL в Docker? (одно слово, имя инструмента)"
  answers:
    - "Testcontainers"
    - "testcontainers"
  explanation: "Testcontainers: контейнер с реальной СУБД на время теста. Диалект, индексы, блокировки и миграции — как в проде."

- type: single
  question: "Итог модуля. Отчёт «проекты с числом открытых задач» на проде тормозит, в логах сотни SELECT'ов по project_id. Ваш первый шаг?"
  options:
    - "Посчитать в базе: агрегат-проекция с GROUP BY вместо загрузки задач в Java; при загрузке списков — EntityGraph/JOIN FETCH"
    - "Добавить памяти приложению"
    - "Поднять пул соединений с базой"
    - "Вынести отчёт в отдельный микросервис"
  correct: 0
  explanation: "Сотни однотипных SELECT'ов = N+1. Лечение — из урока 3: агрегация в базе или догрузка связей одним запросом. Инфраструктурные костыли проблему не убирают."
```
