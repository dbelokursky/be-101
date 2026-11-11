---
id: m3-lesson-02
title: "JPA и Hibernate: объекты и таблицы"
module: 3
moduleTitle: "Данные"
order: 2
---

# Урок 2. JPA и Hibernate: объекты и таблицы

В пилоте entity была одной таблицей без связей. Реальные сущности связаны: у проекта — задачи, у задачи — комментарии. Разберём, как связи живут в Java, кто и когда ходит в базу, и почему «ленивость» — не оскорбление, а способ выжить.

## Entity со связью

```java
@Entity
@Table(name = "projects")
@Getter @Setter
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // один проект — много задач
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks = new ArrayList<>();
}

@Entity
@Table(name = "tasks")
@Getter @Setter
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    // много задач — один проект: ВЛАДЕЛЕЦ связи (колонка project_id в tasks)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;
}
```

Правило запоминания: **владелец связи — сторона с внешним ключом**. У нас FK в `tasks`, значит владелец — `Task.project`, а `Project.tasks` — «зеркальная» сторона (`mappedBy` говорит: «смотри колонцию на той стороне»).

Что даёт связь в коде:

```java
Task task = taskRepository.findById(42L).orElseThrow();
String projectName = task.getProject().getName();   // без ручного JOIN!
```

## CascadeType: кто за кем тянет

`cascade = ALL` на `Project.tasks` — операции передаются вниз по связи:

- `persist(project)` — сохранился и проект, и его новые задачи
- `remove(project)` — удалился проект **и его задачи** (плюс `orphanRemoval`: убрал задачу из списка — она удалилась)

Опасно и удобно одновременно: каскад `ALL` с `remove` может снести больше, чем хотелось. В командных проектах часто ставят точечно: `cascade = {PERSIST, MERGE}`.

## Lazy: не тянуть лишнее

`@ManyToOne(fetch = LAZY)` — при загрузке задачи её проект **не загружается**: вместо объекта Hibernate кладёт прокси-заглушку. Настоящий SELECT за проектом случится только при первом обращении:

```java
Task task = taskRepository.findById(42L).orElseThrow();  // SELECT из tasks
task.getProject().getName();                              // SELECT из projects — вот сейчас
```

`@OneToMany` по умолчанию ленив (и оставляйте так). `@ManyToOne`/`@OneToOne` по умолчанию жадные (**EAGER**) — и это худшее значение по умолчанию в JPA: кладёте `LAZY` руками почти всегда.

Почему ленивость важна: без неё чтение одной задачи тянуло бы проект, проект — все его задачи, каждая задача — комментарии… «Взял один объект — загрузил полбазы».

## Ловушка LazyInitializationException

Ленивость работает, только пока открыт **контекст персистентности** (Hibernate-сессия). Классика Spring:

```java
@Transactional
public void business() {
    Task task = taskRepository.findById(42L).orElseThrow();
    return task.getProject().getName();  // ок: сессия открыта
}

public void broken() {
    Task task = taskRepository.findById(42L).orElseThrow();
    task.getProject().getName();  // LazyInitializationException!
                                     // транзакции нет, сессия закрыта
}
```

Лечение — не «сделать EAGER», а загрузить нужное внутри транзакции (следующий урок — как, через JOIN FETCH).

> **🔧 QA:** `LazyInitializationException` в логах = код обратился к ленивой связи за пределами транзакции. Это не «база сломалась», это бордер-эффект слоёв: репозиторий отдал объект, а хвостик догрузить некому.

## Hibernate генерирует SQL

Что видит база под кодом (включите `spring.jpa.show-sql: true` в деве — и смотрите):

| Код | SQL |
|---|---|
| `findById(42)` | `SELECT ... FROM tasks WHERE id = 42` |
| `task.getProject().getName()` (lazy) | `SELECT ... FROM projects WHERE id = ?` |
| `save(newTask)` | `INSERT INTO tasks ...` |
| изменение managed-entity внутри транзакции | `UPDATE tasks SET ... WHERE id = ?` |

Последняя строка — самое неочевидное: в транзакции Hibernate сам сравнивает снимок entity с текущим состоянием (**dirty checking**) и сам генерирует UPDATE. Изменил поле — не вызывай `save()`, коммит транзакции всё сохранит.

## Идентичность: equals/hashCode

Две загрузки `findById(42)` внутри одной транзакции — **один и тот же объект** (кэш первого уровня — сессии). `new Task(42)` и `findById(42)` — разные объекты по Java, но одна строка в базе. Поэтому у entity `equals/hashCode` строят по бизнес-ключу или id, а не по всем полям; в лабах мы этим займёмся.

## Итог

- Связи: владелец — сторона с FK (`@ManyToOne` + `@JoinColumn`), зеркальная — `mappedBy`
- Каскады передают операции по связи — удобно, но с `remove` осторожно
- `LAZY` по умолчанию для коллекций, руками — для `@ManyToOne`; иначе «загрузил одно — получил полбазы»
- Ленивое догружается только в открытой сессии: вне транзакции — `LazyInitializationException`
- Dirty checking: изменение managed-entity внутри транзакции само становится UPDATE

Следующий урок — про производительность: знаменитая проблема N+1 и как её лечить.

## Квиз

```quiz
- type: single
  question: "У Task есть @ManyToOne @JoinColumn(name = \"project_id\") Project project, а у Project — @OneToMany(mappedBy = \"project\"). Кто владелец связи?"
  options:
    - "Task: владелец — сторона, где колонка внешнего ключа"
    - "Project: у него список"
    - "Обе стороны владеют поровну"
    - "Никто: связью управляет база"
  correct: 0
  explanation: "Владение — про колонку FK: она в tasks, значит владелец Task.project. mappedBy на Project лишь отражает связь, записи в неё не влияют на базу."

- type: single
  codeLang: java
  code: |
    @Transactional
    public String projectName(Long taskId) {
        Task task = taskRepository.findById(taskId).orElseThrow();
        return task.getProject().getName();
    }
  question: "Сколько SELECT-запросов выполнит этот код (связь LAZY, проект не кэширован)?"
  options:
    - "Два: сначала задача, потом проект при обращении к getName()"
    - "Один: Hibernate догрузит всё сразу"
    - "Ни одного: вернётся прокси"
    - "Три: задача, проект и имя отдельно"
  correct: 0
  explanation: "findById — SELECT из tasks. getName() на ленивом прокси — второй SELECT из projects. Внутри транзакции это работает; вне её было бы LazyInitializationException."

- type: multi
  question: "Почему @ManyToOne стоит помечать LAZY руками? (несколько ответов)"
  options:
    - "По умолчанию он EAGER и грузит связанную сущность всегда, даже когда она не нужна"
    - "Жадные связи расцветают цепочкой: задача → проект → все его задачи → их комментарии"
    - "LAZY ускоряет запись в базу"
    - "EAGER ломает схему таблиц"
  correct: [0, 1]
  explanation: "Проблема EAGER — чтение: тянутся объекты, которые не просили, и каскадом ещё объекты. На запись fetch не влияет."

- type: single
  question: "В логах продакшена LazyInitializationException. Что произошло?"
  options:
    - "К коде обратились к ленивой связи после закрытия транзакции/сессии"
    - "База данных недоступна"
    - "Не хватило памяти под объект"
    - "Пароль от базы истёк"
  correct: 0
  explanation: "Ленивый прокси умеет догрузиться только пока открыта сессия. Вне транзакции (например, в маппере после выхода из @Transactional-метода) обращение падает с этим исключением."

- type: blank
  question: "Как называется механизм, при котором Hibernate сам сравнивает состояние entity в сессии с исходным снимком и генерирует UPDATE без явного вызова save()? (два слова: ___ checking)"
  answers:
    - "dirty checking"
    - "dirty"
  explanation: "Dirty checking: «грязное» (изменённое) поле найдено — при коммите транзакции Hibernate сам выполнит UPDATE."

- type: single
  codeLang: java
  code: |
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks = new ArrayList<>();
  question: "Что сделает удаление проекта с такой настройкой?"
  options:
    - "Удалит проект и все его задачи из базы"
    - "Удалит только проект, задачи останутся без проекта (если база позволит)"
    - "Удалит только задачи"
    - "Ничего: каскад запрещает удаление"
  correct: 0
  explanation: "CascadeType.ALL передаёт remove вниз, orphanRemoval добивает «осиротевшие» задачи. Мощно — и опасно: проверяйте, действительно ли вы хотите снести всё поддерево."

- type: match
  question: "Сопоставь код и SQL, который сгенерирует Hibernate."
  pairs:
    - left: "findById(42L)"
      right: "SELECT ... WHERE id = 42"
    - left: "repository.save(newTask)"
      right: "INSERT INTO tasks ..."
    - left: "изменение поля managed-entity в транзакции"
      right: "UPDATE tasks SET ... при коммите"
    - left: "обращение к ленивому task.getProject()"
      right: "SELECT ... FROM projects WHERE id = ?"
```
