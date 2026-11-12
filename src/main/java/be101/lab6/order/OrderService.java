package be101.lab6.order;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicLong;

/**
 * TODO 1: внедрить KafkaTemplate и опубликовать событие.
 *
 * 1) Добавьте поле и конструктор:
 *        private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
 *        (бин orderEventsKafkaTemplate уже объявлен в KafkaConfig)
 * 2) В create() после «сохранения»:
 *        kafkaTemplate.send("orders.created",
 *                String.valueOf(order.id()),
 *                new OrderCreatedEvent(order.id(), order.customer(), order.amount()));
 *
 * Ключ — id заказа: события одного заказа пойдут по порядку (урок 2).
 */
@Service
public class OrderService {

    private final AtomicLong sequence = new AtomicLong();

    public Order create(BigDecimal amount, String customer) {
        Order order = new Order(sequence.incrementAndGet(), customer, amount);
        // TODO 1: опубликовать OrderCreatedEvent с ключом = order.id()
        return order;
    }
}
