package be101.lab10.order;

import be101.lab10.order.dto.CreateOrderRequest;
import be101.lab10.order.dto.OrderResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final OrderOutboxRepository outboxRepository;
    private final Counter ordersCreated;

    public OrderService(OrderRepository orderRepository,
                        OrderMapper orderMapper,
                        OrderOutboxRepository outboxRepository,
                        MeterRegistry registry) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
        this.outboxRepository = outboxRepository;
        this.ordersCreated = Counter.builder("orders.created.total")
                .description("Создано заказов")
                .register(registry);
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        Order order = orderMapper.toEntity(request);
        Order saved = orderRepository.save(order);
        outboxRepository.save(new OrderOutbox(saved));

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                ordersCreated.increment();
            }
        });
        return orderMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream()
                .map(orderMapper::toResponse)
                .toList();
    }
}
