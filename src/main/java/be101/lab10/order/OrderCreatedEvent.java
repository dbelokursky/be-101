package be101.lab10.order;

import java.math.BigDecimal;

/**
 * Готовое событие (payload факта «заказ создан»). Ключом публикации будет id заказа.
 */
public record OrderCreatedEvent(Long orderId, String customer, BigDecimal amount) {
}
