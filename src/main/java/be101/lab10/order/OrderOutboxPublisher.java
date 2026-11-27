package be101.lab10.order;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OrderOutboxPublisher {

    @Scheduled(cron = "${be101.outbox.cron:*/1 * * * * *}")
    public void publishNext() {
        // TODO: обработать одну ожидающую запись outbox в отдельной транзакции.
    }
}
