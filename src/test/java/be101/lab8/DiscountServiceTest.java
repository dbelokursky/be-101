package be101.lab8;

import org.junit.jupiter.api.Test;

/**
 * TODO: написать юнит-тесты DiscountService до покрытия 80%+ строк.
 * Приёмник лабы — правило JaCoCo в pom.xml: mvn test упадёт, пока покрытия нет.
 *
 * Кейсы (урок «JUnit и Mockito»):
 *   TODO 1: amount <= 0 → IllegalArgumentException (и отдельно ноль)
 *   TODO 2: VIP, 1000 → 100 (10%)
 *   TODO 3: REGULAR, 5000 → 250 (граница «больше или равно»)
 *   TODO 4: REGULAR, 4999.99 → 0
 *   TODO 5: NEW, 200 → 6 (3%)
 *
 * Подсказки:
 *   assertThat(d).isEqualByComparingTo(new BigDecimal("100"));   // деньги — сравнением значений
 *   assertThatThrownBy(() -> svc.discountFor(tier, new BigDecimal("-1")))
 *       .isInstanceOf(IllegalArgumentException.class);
 *
 * Моки здесь не нужны: у сервиса нет соседей — это тоже осознанное решение (урок 2).
 */
class DiscountServiceTest {

    // TODO: ваши тесты

    @Test
    void placeholder_removeMe() {
        // Удалите этот тест-заглушку и напишите настоящие кейсы выше
    }
}
