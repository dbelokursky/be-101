package be101.lab10.order;

import be101.lab10.order.dto.CreateOrderRequest;
import be101.lab10.order.dto.OrderResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private final Counter ordersCreated;

    public OrderService(OrderRepository orderRepository,
                        OrderMapper orderMapper,
                        KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                        MeterRegistry registry) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.ordersCreated = Counter.builder("orders.created.total")
                .description("Создано заказов")
                .register(registry);
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        Order order = orderMapper.toEntity(request);
        Order saved = orderRepository.save(order);

        // Исходный пример для диагностики: отправка и метрика выполняются до коммита БД.
        kafkaTemplate.send("orders.created",
                String.valueOf(saved.getId()),
                new OrderCreatedEvent(UUID.randomUUID(), saved.getId(), saved.getCustomer(), saved.getAmount()));

        ordersCreated.increment();
        return orderMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream()
                .map(orderMapper::toResponse)
                .toList();
    }
}
