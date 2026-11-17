---
id: m6-lesson-02
title: "JUnit и Mockito: юнит-тесты"
module: 6
moduleTitle: "Тесты на бэкенде"
order: 2
---

# Урок 2. JUnit и Mockito: юнит-тесты

Юнит-тест — это обычный Java-метод, который зовёт ваш код и сравнивает результат с ожиданием. Фреймворк **JUnit** находит такие методы и запускает; **Mockito** подменяет соседей (репозитории, клиенты), чтобы тестировался один класс в изоляции.

## Анатомия теста

```java
@ExtendWith(MockitoExtension.class)          // включить Mockito
class DiscountServiceTest {

    @Mock                                     // заглушка соседа
    private OrderRepository orderRepository;

    @InjectMocks                              // тестируемый объект с моками внутрь
    private DiscountService discountService;

    @Test                                     // = тест, его найдёт JUnit
    void calculatesTenPercentDiscount_whenCustomerIsVip() {
        // Arrange
        Customer vip = new Customer("ann", CustomerTier.VIP);
        given(orderRepository.ordersCount("ann")).willReturn(25);
        BigDecimal price = new BigDecimal("1000");

        // Act
        BigDecimal discount = discountService.discountFor(vip, price);

        // Assert
        assertThat(discount).isEqualByComparingTo(new BigDecimal("100"));
    }

    @Test
    void throws_whenPriceIsNegative() {
        assertThatThrownBy(() ->
                discountService.discountFor(vip(), new BigDecimal("-1")))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
```

Читать сверху вниз: подготовили клиента и мок (`given…willReturn`), вызвали метод, сравнили. Имя метода — мини-ТЗ: `что_при_условии_результат`.

**AssertJ** (`assertThat`) — стандарт де-факто для ассертов: `isEqualByComparingTo` для денег (не `equals`!), `contains`, `hasSize`, `extracting`. Подсказки по цепочке даёт IDE.

## Mockito: три команды, которых хватает

```java
given(repo.findById(42L)).willReturn(Optional.of(order));  // на входе
given(repo.save(any())).willAnswer(inv -> inv.getArgument(0));

verify(repo).deleteById(42L);                               // взаимодействие
verify(mailClient, never()).send(any());                    // чего НЕ было
```

- `given/willReturn` — «когда позовут так — ответь вот так»
- `any()`, `eq(42L)` — матчеры аргументов
- `verify` — проверка взаимодействия: «должен был сохранить ровно один раз»

**Не переусердствуйте**: `verify` на каждый чих делает тест хрупким (поменяли порядок вызовов — тест красный, хотя поведение то же). Проверяйте состояние и результат; `verify` — для случаев, когда сам вызов и есть суть («письмо отправлено ровно один раз»).

## Данные: @BeforeEach и параметризация

```java
@BeforeEach
void setUp() {
    service = new DiscountService();          // свежий для каждого теста
}

@ParameterizedTest
@ValueSource(strings = {"", " ", "   "})       // один тест — три кейса
void rejectsBlankTitles(String title) {
    assertThatThrownBy(() -> service.validate(title))
        .isInstanceOf(ValidationException.class);
}
```

Правила здорового набора:

- тесты **не зависят друг от друга**: порядок запуска не важен, каждый готовит себя сам
- `@BeforeEach` — общая подготовка; состояние между тестами не таскают
- параметризация вместо копипасты: граничные значения (`0`, `1`, `MAX`), негативы, пустые строки

## Что мокать, а что нет

| Мокаем | Не мокаем |
|---|---|
| Репозитории/шлюзы в юнит-тестах сервиса | Сам тестируемый класс |
| Внешние API (платёжный шлюз) | value-объекты и мапперы (проверяются как есть) |
| Часы/генераторы случайности | То, что уже мок (мок мока) |

Хрупкий признак: тест падает от любого чиха — вы замокали слишком много и тестируете моки. Отходите на интеграционный уровень (урок 3).

## Тесты ловят: практический пример

Баг в `discountFor`: сравнение `BigDecimal` через `==` или `equals` вместо `compareTo` — классика (`new BigDecimal("100")` не `equals` `new BigDecimal("100.00")`). Тест с `isEqualByComparingTo` ловит на первой же итерации — это дешевле, чем расчёт скидки в чеке клиента.

> **🔧 QA:** негативные кейсы, которые вы заносите в TestRail, здесь выглядят так: `assertThatThrownBy` + `@ParameterizedTest` с невалидными значениями. Data-driven — буквально: таблица кейсов над одним методом.

> **💡 Фронтендерам:** `@Test` ≈ `it()`, `given/willReturn` ≈ `vi.mock`/`jest.mock`, `@ExtendWith` ≈ конфиг теста. AssertJ — как expect + chai вместе, только с флюент-цепочками.

## Итог

- Юнит = AAA: `given` подготовка → вызов → `assertThat` проверка; имя = мини-ТЗ
- Mockito: `given/willReturn` на вход, `verify` — точечно, для сущностных взаимодействий
- Тесты независимы: `@BeforeEach`, никакого общего состояния; `@ParameterizedTest` против копипасты
- Мокают соседей и внешние границы; value-объекты и сам класс — никогда
- Хрупкость = симптом: слишком много моков → спускайтесь уровнем ниже

Следующий урок — интеграционные тесты: Spring поднимает ваши слои по-настоящему.

## Квиз

```quiz
- type: single
  codeLang: java
  code: |
    @Test
    void calculatesDiscount() {
      given(repo.ordersCount("ann")).willReturn(25);
      BigDecimal d = service.discountFor(vip("ann"), new BigDecimal("1000"));
      assertThat(d).isEqualByComparingTo(new BigDecimal("100"));
    }
  question: "Что здесь фаза Act?"
  options:
    - "Строка с `service.discountFor(...)`: собственно вызов тестируемого поведения"
    - "Строка с `given(...)`"
    - "Строка с `assertThat(...)`"
    - "Аннотация @Test"
  correct: 0
  explanation: "AAA: given — Arrange, вызов discountFor — Act, assertThat — Assert. Одна фаза — одна строка обычно; если Act разрастается, тестируемое поведение не атомарно."

- type: single
  question: "Почему для BigDecimal в ассертах используют isEqualByComparingTo, а не equals?"
  options:
    - "equals учитывает масштаб: 100 и 100.00 не равны, а по деньгам — одинаковы; сравнивать нужно числовое значение"
    - "equals не существует у BigDecimal"
    - "Так быстрее"
    - "equals проверяет ссылки"
  correct: 0
  explanation: "Классика Java: new BigDecimal(\"100\").equals(new BigDecimal(\"100.00\")) == false. Тест с equals падал бы на валидном коде — или, хуже, пропускал бы денежный баг с масштабом."

- type: multi
  question: "Признаки здорового юнит-набора: (несколько ответов)"
  options:
    - "Тесты не зависят от порядка запуска"
    - "Общая подготовка в @BeforeEach, состояния между тестами нет"
    - "Один тест проверяет одно поведение"
    - "Каждый вызов каждого мока проверен verify"
  correct: [0, 1, 2]
  explanation: "Verify на каждый вызов — антипаттерн хрупкости: тест прилипает к реализации, а не поведению. Verify — для взаимодействий, которые и есть суть (одно письмо, один платёж)."

- type: match
  question: "Сопоставьте инструмент и роль."
  pairs:
    - left: "@Test"
      right: "Метод, который находит и запускает JUnit"
    - left: "given/willReturn"
      right: "Мок отвечает заданным значением на заданный вызов"
    - left: "verify"
      right: "«Взаимодействие было/не было» — точечно"
    - left: "@ParameterizedTest"
      right: "Один тест — таблица кейсов"

- type: single
  question: "Тест сервиса падает от любого рефакторинга, хотя поведение не менялось. Диагноз?"
  options:
    - "Замокано слишком много и verify прилип к деталям реализации — спуститься на интеграционный уровень"
    - "Тесты слишком независимые"
    - "Нужен ещё один мок"
    - "Переименовать тесты"
  correct: 0
  explanation: "Хрупкость (fragile test) — сигнал перебора с моками. Тест должен держать поведение, а не последовательность вызовов внутри."

- type: blank
  question: "Какой фреймворк-библиотека даёт флюент-ассерты вида assertThat(x).contains(\"...\")? (одно слово)"
  answers:
    - "assertj"
    - "AssertJ"
  explanation: "AssertJ — стандарт ассертов в Spring-мире: цепочки, понятные сообщения об ошибке, isEqualByComparingTo для денег."

- type: single
  question: "Что из перечисленного мокать в юнит-тесте НЕ нужно?"
  options:
    - "Тестируемый сервис и его value-объекты (record-DTO)"
    - "Репозиторий"
    - "HTTP-клиент внешнего API"
    - "Часы (Clock)"
  correct: 0
  explanation: "Мок тестируемого класса = тест мока. Соседей и внешние границы — да; сам объект и его данные — нет."
```
