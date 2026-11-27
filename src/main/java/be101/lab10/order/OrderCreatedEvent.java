package be101.lab10.order;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Готовое событие (payload факта «заказ создан»). Ключом публикации будет id заказа.
 */
public record OrderCreatedEvent(UUID eventId, Long orderId, String customer, BigDecimal amount) {
}
