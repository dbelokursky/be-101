---
id: lesson-03
title: Java-минимум для чтения кода
module: 1
order: 3
---

# Урок 3. Java-минимум для чтения кода

Чтобы читать Spring-код, не нужно знать всю Java. Хватит десяти конструкций — и большинство из них вы уже видели в TypeScript или Python. Этот урок — шпаргалка: читаем её сейчас, а возвращаемся, когда в уроках 4–5 встретится незнакомый синтаксис.

> **💡 Фронтендерам:** Java похожа на TypeScript: статические типы, классы, интерфейсы, дженерики (`List<String>` ≈ `string[]`, `Map<String, Integer>` ≈ `Record<string, number>`). Главное отличие — многословность и аннотации вместо декораторов… хотя декораторы в TS — те же аннотации, только стандартнее.

## Класс — чертёж объекта

```java
public class Order {
    private final String number;      // поле: данные
    private BigDecimal amount;        // ещё поле
    private String status;

    public Order(String number, BigDecimal amount) {   // конструктор
        this.number = number;
        this.amount = amount;
        this.status = "NEW";
    }

    public BigDecimal getAmount() {   // метод: поведение
        return amount;
    }

    public void cancel() {            // void = ничего не возвращает
        this.status = "CANCELLED";
    }
}
```

Читать так: **класс** `Order` — чертёж; `new Order("A-1", ...)` — конкретный объект, *экземпляр*. **Поля** — данные объекта, **методы** — его поведение. `private`/`public` — видимость: снаружи класса видно только `public`.

> **📐 Аналитикам:** поле класса ≈ атрибут сущности в вашей модели, метод ≈ операция над ней. `Order` с полями `number`, `amount`, `status` — это ровно ваша карточка сущности «Заказ», просто в синтаксисе Java.

## Типы: главное

| Тип | Что это | Пример |
|---|---|---|
| `String` | строка | `"NEW"` |
| `int`, `long` | целые числа | `42` |
| `boolean` | истина/ложь | `true` |
| `BigDecimal` | **деньги** (точная арифметика) | `new BigDecimal("5990.00")` |
| `List<T>` | список | `List<String> tags` |
| `Map<K,V>` | словарь | `Map<String, Integer>` |
| `record` | неизменяемый контейнер данных | `record Point(int x, int y) {}` |

Две привычки, которые вы будете встречать постоянно:

- **Деньги — всегда `BigDecimal`**, не `double`: числа с плавающей точкой копят погрешность (`0.1 + 0.2 != 0.3`), а в ценах терять копейки нельзя.
- `final` — значение нельзя переприсвоить. Поле `final` задаётся один раз в конструкторе: иммутабельность, любимо и бэкендом, и фронтендом.

## Аннотации: метки для фреймворков

`@Что-то` над классом, полем или методом — **аннотация**: метаданные, которые читает не ваша программа, а фреймворк.

```java
@Override                     // «я переопределяю метод родителя»
public String toString() { ... }

@Transactional               // Spring: выполнить метод в транзакции
public void createOrder(...) { ... }
```

Spring построен на этом: `@RestController`, `@Service`, `@Entity` — аннотации, по которым фреймворк находит ваши классы и решает, что с ними делать. Это как декораторы в TS — только читает их Spring при старте приложения.

## Lombok: меньше бойлерплейта

В Java классы данных получаются многословными: конструктор, геттеры, сеттеры, equals, toString… **Lombok** генерирует это за вас на этапе компиляции:

```java
@Getter                     // сгенерирует getNumber(), getAmount(), getStatus()
@Builder                    // сгенерирует builder: Order.builder()...build()
public class Order {
    private final String number;
    private BigDecimal amount;
    private String status;
}
```

В реальных проектах так и выглядит: тонкий класс с аннотациями `@Getter`, `@Builder`, `@Data`. Если не видите геттер в коде — его сгенерировал Lombok, IDE его покажет.

## Optional: честный «может не быть»

Метод может не найти значение. Возвращать `null` — русская рулетка (забыл проверить — `NullPointerException`). Java-способ — обёртка `Optional`:

```java
Optional<Order> found = orderRepository.findByNumber("A-1");

found.ifPresent(order -> log.info(order.getStatus()));  // если есть
Order order = found.orElseThrow(() -> new OrderNotFoundException("A-1"));
BigDecimal amount = found.map(Order::getAmount).orElse(BigDecimal.ZERO);
```

Читаете `Optional<Order>` — сразу понятно: «заказ может не найтись, обработай это». `map`/`orElse` — как у optional chaining `?.` и `??` в TypeScript.

## Интерфейс и реализация

```java
public interface OrderService {          // контракт: ЧТО умеет
    Order create(CreateOrderRequest request);
    Optional<Order> findByNumber(String number);
}

@Service
public class OrderServiceImpl implements OrderService {   // КАК умеет
    @Override
    public Order create(CreateOrderRequest request) { ... }
}
```

Контракт отдельно, реализация отдельно. Когда код просит «дай мне `OrderService`», Spring подставит реализацию — это **Dependency Injection**, механика урока 4. Пока достаточно: видите `interface X` и `class XImpl implements X` — это «что» и «как».

## Как читать незнакомый Java-файл

1. **Аннотации над классом** — кто это (`@RestController`? `@Service`? `@Entity`?) — главная подсказка роли.
2. **Поля** — какие данные держит.
3. **Публичные методы** — что умеет; их параметры и возвращаемые типы — вход и выход.
4. Детали реализации — по необходимости.

## Итог

- Класс = чертёж: поля (данные) + методы (поведение); `new` = экземпляр
- Деньги — `BigDecimal`; `final` = «не переприсваивать»
- `@Аннотации` — метки для фреймворков, Lombok генерирует бойлерплейт
- `Optional<T>` — честное «значения может не быть», как `?.` и `??`
- `interface` — контракт, `Impl` — реализация; связывает Spring
- Алгоритм чтения файла: аннотации → поля → публичные методы

Теперь вы готовы читать Spring-контроллер целиком — этим и займёмся.

## Квиз

```quiz
- type: single
  question: "В коде встретили строку new Order(\"A-1\", amount). Что она делает?"
  options:
    - "Создаёт новый объект-экземпляр класса Order, вызвав конструктор"
    - "Объявляет класс Order"
    - "Копирует существующий заказ A-1"
    - "Подключает зависимость Order через Spring"
  correct: 0
  explanation: "new + имя класса = создать экземпляр по чертежу-классу, передав аргументы в конструктор. Класс объявляется словом class, зависимости подключает Spring без new."

- type: single
  codeLang: java
  code: |
    double price = 0.1 + 0.2;              // 0.30000000000000004
    BigDecimal money = new BigDecimal("0.1").add(new BigDecimal("0.2"));  // ровно 0.3
  question: "Почему в бэкенде деньги держат в BigDecimal, а не в double?"
  options:
    - "double копит погрешность округления — в ценах нельзя терять копейки"
    - "BigDecimal работает быстрее double"
    - "double нельзя складывать"
    - "BigDecimal занимает меньше памяти"
  correct: 0
  explanation: "Числа с плавающей точкой — двоичные дроби, 0.1 в них не представимо точно, погрешности накапливаются. BigDecimal хранит десятичную запись точно. Скорость у него ниже — но в расчётах денег точность важнее."

- type: multi
  question: "Какие утверждения верны? (несколько ответов)"
  options:
    - "Аннотация — это метаданные, которые читает фреймворк, а не ваша логика"
    - "Lombok генерирует геттеры и билдеры на этапе компиляции"
    - "Optional<T> гарантирует, что внутри никогда не лежит null"
    - "Метод с возвращаемым типом void возвращает значение null"
  correct: [0, 1]
  explanation: "Optional — это сигнал «обработай отсутствие значения», а не гарантия отсутствия null внутри (обёртка сама может быть null, если её так создали). void означает «метод ничего не возвращает», это не null."

- type: blank
  question: "Какое ключевое слово пишут перед методом, который ничего не возвращает? Например, у метода cancel()."
  answers:
    - "void"
  explanation: "void = «пусто»: метод выполняет действия, но не возвращает значение."

- type: match
  question: "Сопоставь понятие Java и его смысл."
  pairs:
    - left: "Класс"
      right: "Чертёж объекта: поля и методы"
    - left: "Аннотация"
      right: "Метка-метаданные для фреймворков"
    - left: "Интерфейс"
      right: "Контракт: что должно уметь"
    - left: "Optional"
      right: "Честное «значения может не быть»"

- type: single
  codeLang: java
  code: |
    Optional<User> user = userRepository.findByLogin("ann");

    String name = user
        .map(User::getName)
        .orElse("guest");
  question: "Пользователя с логином ann в базе нет. Что окажется в переменной name?"
  options:
    - "Строка \"guest\""
    - "null"
    - "Исключение NullPointerException"
    - "Пустая строка \"\""
  correct: 0
  explanation: "Пустой Optional.map(...) возвращает пустой Optional, а orElse(\"guest\") подставляет значение по умолчанию. Это аналог user?.name ?? \"guest\" в TypeScript."

- type: single
  question: "В проекте есть interface OrderService и класс OrderServiceImpl implements OrderService. Зачем так делается?"
  options:
    - "Контракт отделён от реализации: код зависит от «что умеет», а какую реализацию подсунуть — решает Spring"
    - "Это требование компилятора: без интерфейса класс не скомпилируется"
    - "Интерфейс нужен только для документации, на код не влияет"
    - "Так скрывают пароли реализации от базы данных"
  correct: 0
  explanation: "Классы могут зависеть от интерфейса, а Spring (Dependency Injection) подставит реализацию. Это позволяет менять «как» не трогая «что», и подменять реализацию в тестах."
```
