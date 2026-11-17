package be101.lab8;

import java.math.BigDecimal;

/**
 * Готовый бизнес-сервис: правила скидки (урок «JUnit и Mockito»).
 * Менять его нельзя — ваша задача описать его поведение тестами.
 *
 * Правила (для README и тест-кейсов):
 *   - amount <= 0            → IllegalArgumentException
 *   - VIP                    → 10% от суммы
 *   - REGULAR и сумма >= 5000 → 5%
 *   - REGULAR и сумма < 5000  → без скидки (0)
 *   - NEW                    → 3%
 */
public class DiscountService {

    public BigDecimal discountFor(CustomerTier tier, BigDecimal amount) {
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        BigDecimal percent = switch (tier) {
            case VIP -> new BigDecimal("10");
            case REGULAR -> amount.compareTo(new BigDecimal("5000")) >= 0
                    ? new BigDecimal("5")
                    : BigDecimal.ZERO;
            case NEW -> new BigDecimal("3");
        };
        return amount.multiply(percent).divide(new BigDecimal("100"));
    }
}
