package be101.lab6.order;

import java.math.BigDecimal;

/**
 * Готовый доменный объект лабы.
 */
public record Order(Long id, String customer, BigDecimal amount) {
}
