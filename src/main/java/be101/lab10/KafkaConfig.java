package be101.lab10;

import be101.lab10.order.OrderCreatedEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

/**
 * Готовое: типизированный KafkaTemplate для событий заказов (лаба 6).
 */
@Configuration
public class KafkaConfig {

    @Bean
    @SuppressWarnings("unchecked")
    public KafkaTemplate<String, OrderCreatedEvent> orderEventsKafkaTemplate(
            ProducerFactory<?, ?> producerFactory) {
        return new KafkaTemplate<>((ProducerFactory<String, OrderCreatedEvent>) producerFactory);
    }
}
