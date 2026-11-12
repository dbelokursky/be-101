package be101.lab6.order;

import java.math.BigDecimal;

/**
 * Готовое событие: payload факта «заказ создан».
 */
public record OrderCreatedEvent(Long orderId, String customer, BigDecimal amount) {
}
