package be101.lab8;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Юнит-тесты правил скидки: каждый кейс — своя ветка сервиса.
 * Деньги сравниваются isEqualByComparingTo (урок «JUnit и Mockito»).
 */
class DiscountServiceTest {

    private final DiscountService service = new DiscountService();

    @Test
    void discountFor_vip_returnsTenPercent() {
        BigDecimal discount = service.discountFor(CustomerTier.VIP, new BigDecimal("1000"));
        assertThat(discount).isEqualByComparingTo(new BigDecimal("100"));
    }

    @Test
    void discountFor_regularAtThreshold_returnsFivePercent() {
        BigDecimal discount = service.discountFor(CustomerTier.REGULAR, new BigDecimal("5000"));
        assertThat(discount).isEqualByComparingTo(new BigDecimal("250"));
    }

    @Test
    void discountFor_regularBelowThreshold_returnsZero() {
        BigDecimal discount = service.discountFor(CustomerTier.REGULAR, new BigDecimal("4999.99"));
        assertThat(discount).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void discountFor_newCustomer_returnsThreePercent() {
        BigDecimal discount = service.discountFor(CustomerTier.NEW, new BigDecimal("200"));
        assertThat(discount).isEqualByComparingTo(new BigDecimal("6"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "-999.99"})
    void discountFor_nonPositiveAmount_throws(String amount) {
        assertThatThrownBy(() ->
                service.discountFor(CustomerTier.VIP, new BigDecimal(amount)))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
