package be101.lab10.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_outbox")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderOutbox {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false)
    private String customer;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    private Instant publishedAt;

    public OrderOutbox(Order order) {
        this.eventId = UUID.randomUUID();
        this.orderId = order.getId();
        this.customer = order.getCustomer();
        this.amount = order.getAmount();
    }

    OrderCreatedEvent toEvent() {
        return new OrderCreatedEvent(eventId, orderId, customer, amount);
    }

    void markPublished(Instant time) {
        publishedAt = time;
    }
}
