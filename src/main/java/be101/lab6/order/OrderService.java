package be101.lab6.order;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Создаём заказ и публикуем факт. Ключ — id заказа: события одного заказа
 * всегда в одной партиции и по порядку (урок 2 модуля).
 */
@Service
public class OrderService {

    private final AtomicLong sequence = new AtomicLong();
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    public OrderService(KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public Order create(BigDecimal amount, String customer) {
        Order order = new Order(sequence.incrementAndGet(), customer, amount);
        kafkaTemplate.send("orders.created",
                String.valueOf(order.id()),
                new OrderCreatedEvent(order.id(), order.customer(), order.amount()));
        return order;
    }
}
