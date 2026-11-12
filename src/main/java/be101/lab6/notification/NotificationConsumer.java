package be101.lab6.notification;

import be101.lab6.order.OrderCreatedEvent;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * TODO 2: превратить в Kafka-консюмера группы notification-service:
 *
 *   @KafkaListener(topics = "orders.created", groupId = "notification-service")
 *   public void onOrderCreated(OrderCreatedEvent event) {
 *       received.add(event);   // «отправка письма»
 *   }
 *
 * Обработчик идемпотентен по построению: список — только для тестов.
 */
@Component
public class NotificationConsumer {

    private final List<OrderCreatedEvent> received = new CopyOnWriteArrayList<>();

    public List<OrderCreatedEvent> received() {
        return received;
    }

    public void clear() {
        received.clear();
    }
}
