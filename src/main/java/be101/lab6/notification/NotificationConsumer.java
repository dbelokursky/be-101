package be101.lab6.notification;

import be101.lab6.order.OrderCreatedEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Консюмер группы notification-service: каждый инстанс группы получает
 * свою долю партиций, событие достаётся ровно одному (урок 4).
 */
@Component
public class NotificationConsumer {

    private final List<OrderCreatedEvent> received = new CopyOnWriteArrayList<>();

    @KafkaListener(topics = "orders.created", groupId = "notification-service")
    public void onOrderCreated(OrderCreatedEvent event) {
        received.add(event);   // здесь была бы отправка письма
    }

    public List<OrderCreatedEvent> received() {
        return received;
    }

    public void clear() {
        received.clear();
    }
}
