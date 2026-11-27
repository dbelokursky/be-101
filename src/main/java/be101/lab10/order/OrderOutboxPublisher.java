package be101.lab10.order;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
@Slf4j
public class OrderOutboxPublisher {

    private final OrderOutboxRepository outboxRepository;
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    public OrderOutboxPublisher(OrderOutboxRepository outboxRepository,
                                KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(cron = "${be101.outbox.cron:*/1 * * * * *}")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishNext() {
        var pending = outboxRepository.findFirstByPublishedAtIsNullOrderByOrderIdAsc();
        if (pending.isEmpty()) {
            return;
        }

        var entry = pending.get();
        try {
            kafkaTemplate.send("orders.created", entry.getOrderId().toString(), entry.toEvent())
                    .get(5, TimeUnit.SECONDS);
            entry.markPublished(Instant.now());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException | TimeoutException | org.springframework.kafka.KafkaException
                 | org.apache.kafka.common.KafkaException failure) {
            log.warn("Публикация события {} не подтверждена. Причина: {}",
                    entry.getEventId(), failure.getMessage());
        }
    }
}
