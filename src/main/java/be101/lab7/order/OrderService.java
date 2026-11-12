package be101.lab7.order;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Создание заказа, обёрнутое в метрики: счётчик «сколько» и таймер «как долго».
 * Именно эти значения Prometheus заберёт с /actuator/metrics.
 */
@Service
public class OrderService {

    private final AtomicLong sequence = new AtomicLong();

    private final Counter ordersCreated;
    private final Timer createTimer;

    public OrderService(MeterRegistry registry) {
        this.ordersCreated = Counter.builder("orders.created.total")
                .description("Создано заказов")
                .register(registry);
        this.createTimer = Timer.builder("orders.create.time")
                .description("Время создания заказа")
                .register(registry);
    }

    public Order create(BigDecimal amount, String customer) {
        long start = System.nanoTime();
        try {
            return new Order(sequence.incrementAndGet(), customer, amount);
        } finally {
            ordersCreated.increment();
            createTimer.record(System.nanoTime() - start, TimeUnit.NANOSECONDS);
        }
    }
}
