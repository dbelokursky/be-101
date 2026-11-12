package be101.lab7.order;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicLong;

/**
 * TODO 1: бизнес-счётчик Counter "orders.created.total" (описание: «Создано заказов»)
 * TODO 2: таймер Timer "orders.create.time" (описание: «Время создания заказа»)
 *
 * Подсказки:
 *   поля регистрируются в конструкторе через MeterRegistry (см. урок 2 модуля);
 *   счётчик — ordersCreated.increment() после создания;
 *   таймер — createTimer.record(elapsed, TimeUnit.NANOSECONDS),
 *   где elapsed = System.nanoTime() - start (start — в начале метода).
 */
@Service
public class OrderService {

    private final AtomicLong sequence = new AtomicLong();

    public Order create(BigDecimal amount, String customer) {
        // TODO: замер времени и публикация метрик
        return new Order(sequence.incrementAndGet(), customer, amount);
    }
}
