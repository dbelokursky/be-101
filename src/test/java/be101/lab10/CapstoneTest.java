package be101.lab10;

import be101.lab10.order.OrderCreatedEvent;
import be101.lab10.order.OrderOutboxPublisher;
import be101.lab10.order.OrderService;
import be101.lab10.order.dto.CreateOrderRequest;
import be101.lab10.order.dto.OrderResponse;
import com.jayway.jsonpath.JsonPath;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.TimeoutException;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.hamcrest.Matchers.comparesEqualTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник использует настоящие БД и брокер. Планировщик выключен, чтобы тесты
 * могли запустить публикацию в точно выбранный момент.
 */
@SpringBootTest(properties = "be101.outbox.cron=-")
@AutoConfigureMockMvc
@EmbeddedKafka(topics = CapstoneTest.TOPIC, partitions = 1)
@DirtiesContext
class CapstoneTest {

    static final String TOPIC = "orders.created";
    private static final String METRIC = "/actuator/metrics/orders.created.total";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate transactions;

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderOutboxPublisher publisher;

    @Autowired
    private EmbeddedKafkaBroker kafka;

    @MockitoSpyBean
    private KafkaTemplate<String, OrderCreatedEvent> producer;

    @BeforeEach
    void isolateOrders() {
        producer.flush();
        jdbc.update("delete from order_outbox");
        jdbc.update("delete from orders");
    }

    @Test
    void createOrder_returns201AndPersists() throws Exception {
        long id = createOrder("ann", "1990");

        assertThat(savedOrder(id)).isEqualTo(new OrderResponse(id, "ann", new BigDecimal("1990.00"), "NEW"));
        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id));
    }

    @Test
    void createOrder_publishesKafkaEventForThatOrder() throws Exception {
        try (var consumer = observeNewEvents()) {
            long id = createOrder("bob", "4200");

            publisher.publishNext();

            assertEvent(nextEvent(consumer), savedOrder(id));
        }
    }

    @Test
    void createOrder_incrementsBusinessMetricOnce() throws Exception {
        double before = orderCountMetric();

        createOrder("carl", "100");

        assertThat(orderCountMetric()).isEqualTo(before + 1);
    }

    @Test
    void blankCustomer_returns400() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customer":"  ","amount":"100"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void negativeAmount_returns400() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customer":"ann","amount":"-5"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void healthIsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void rollback_leavesNoOrderOutboxEventOrMetric() throws Exception {
        double before = orderCountMetric();

        try (var consumer = observeNewEvents()) {
            long id = transactions.execute(transaction -> {
                long created = orderService.create(new CreateOrderRequest("rollback", BigDecimal.TEN)).id();
                transaction.setRollbackOnly();
                return created;
            });
            publisher.publishNext();
            producer.flush();
            double after = orderCountMetric();

            assertSoftly(softly -> {
                softly.assertThat(jdbc.queryForObject(
                        "select count(*) from orders where id = ?", Integer.class, id))
                        .as("заказ после отката").isZero();
                softly.assertThat(jdbc.queryForObject(
                        "select count(*) from order_outbox where order_id = ?", Integer.class, id))
                        .as("outbox после отката").isZero();
                softly.assertThat(KafkaTestUtils.getRecords(consumer, Duration.ofMillis(500)))
                        .as("новые записи Kafka после отката").isEmpty();
                softly.assertThat(after).as("счётчик после отката").isEqualTo(before);
            });
        }
    }

    @Test
    void kafkaFailure_keepsPendingEventAndRetriesAfterRecovery() throws Exception {
        double before = orderCountMetric();
        doReturn(CompletableFuture.failedFuture(new TimeoutException("Kafka временно недоступна")))
                .when(producer).send(eq(TOPIC), anyString(), any(OrderCreatedEvent.class));

        try (var consumer = observeNewEvents()) {
            long id = createOrder("retry", "250");
            var order = savedOrder(id);
            var pending = outboxState(id);
            assertThat(pending.publishedAt()).isNull();
            verify(producer, never()).send(eq(TOPIC), anyString(), any(OrderCreatedEvent.class));

            publisher.publishNext();
            assertThat(outboxState(id)).isEqualTo(pending);
            verify(producer).send(TOPIC, Long.toString(id),
                    new OrderCreatedEvent(pending.eventId(), id, order.customer(), order.amount()));

            restoreProducer();
            publisher.publishNext();

            assertThat(assertEvent(nextEvent(consumer), order).eventId()).isEqualTo(pending.eventId());
            assertThat(outboxState(id).publishedAt()).isNotNull();

            publisher.publishNext();
            verify(producer, times(2)).send(eq(TOPIC), eq(Long.toString(id)), any(OrderCreatedEvent.class));
            assertThat(orderCountMetric()).isEqualTo(before + 1);
        }
    }

    @Test
    void lostAck_retriesWithTheSameEventId() throws Exception {
        // Брокер принял запись, но обработчик получил таймаут вместо подтверждения.
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var sent = (CompletableFuture<SendResult<String, OrderCreatedEvent>>) invocation.callRealMethod();
            return sent.thenCompose(ack -> CompletableFuture.failedFuture(new TimeoutException("Потерян ack")));
        }).when(producer).send(eq(TOPIC), anyString(), any(OrderCreatedEvent.class));

        try (var consumer = observeNewEvents()) {
            long id = createOrder("duplicate", "350");
            var pending = outboxState(id);

            publisher.publishNext();
            var first = nextEvent(consumer);
            assertThat(outboxState(id)).isEqualTo(pending);

            restoreProducer();
            publisher.publishNext();
            var repeat = nextEvent(consumer);

            assertThat(first.value().eventId()).isEqualTo(pending.eventId());
            assertThat(repeat.key()).isEqualTo(first.key());
            assertThat(repeat.value()).isEqualTo(first.value());
            assertThat(repeat.offset()).isGreaterThan(first.offset());
            assertThat(outboxState(id).publishedAt()).isNotNull();
        }
    }

    private long createOrder(String customer, String amount) throws Exception {
        var response = mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customer":"%s","amount":"%s"}
                                """.formatted(customer, amount)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customer").value(customer))
                .andExpect(jsonPath("$.amount").value(comparesEqualTo(new BigDecimal(amount)), BigDecimal.class))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andReturn().getResponse();
        Number id = JsonPath.read(response.getContentAsString(), "$.id");
        return id.longValue();
    }

    private OrderResponse savedOrder(long id) {
        return jdbc.queryForObject("select id, customer, amount, status from orders where id = ?",
                (rs, row) -> new OrderResponse(rs.getLong("id"), rs.getString("customer"),
                        rs.getBigDecimal("amount"), rs.getString("status")), id);
    }

    private OutboxState outboxState(long id) {
        var states = jdbc.query("select event_id, published_at from order_outbox where order_id = ?",
                (rs, row) -> new OutboxState(rs.getObject("event_id", UUID.class),
                        rs.getObject("published_at", OffsetDateTime.class)), id);
        assertThat(states).as("запись outbox для заказа %s", id).hasSize(1);
        return states.getFirst();
    }

    private double orderCountMetric() throws Exception {
        var response = mockMvc.perform(get(METRIC))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurements[0].statistic").value("COUNT"))
                .andReturn().getResponse();
        Number count = JsonPath.read(response.getContentAsString(), "$.measurements[0].value");
        return count.doubleValue();
    }

    private Consumer<String, OrderCreatedEvent> observeNewEvents() {
        var props = KafkaTestUtils.consumerProps(kafka, "capstone", false);
        var factory = new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(),
                new JsonDeserializer<>(OrderCreatedEvent.class, false));
        var consumer = factory.createConsumer();
        var partition = new TopicPartition(TOPIC, 0);
        consumer.assign(List.of(partition));
        consumer.seekToEnd(List.of(partition));
        consumer.position(partition);
        return consumer;
    }

    private ConsumerRecord<String, OrderCreatedEvent> nextEvent(Consumer<String, OrderCreatedEvent> consumer) {
        return KafkaTestUtils.getSingleRecord(consumer, TOPIC, Duration.ofSeconds(10));
    }

    private OrderCreatedEvent assertEvent(ConsumerRecord<String, OrderCreatedEvent> record, OrderResponse order) {
        OrderCreatedEvent event = record.value();
        assertThat(record.key()).isEqualTo(order.id().toString());
        assertThat(event.eventId()).isNotNull();
        assertThat(event.orderId()).isEqualTo(order.id());
        assertThat(event.customer()).isEqualTo(order.customer());
        assertThat(event.amount()).isEqualByComparingTo(order.amount());
        return event;
    }

    private void restoreProducer() {
        doCallRealMethod().when(producer).send(eq(TOPIC), anyString(), any(OrderCreatedEvent.class));
    }

    private record OutboxState(UUID eventId, OffsetDateTime publishedAt) {
    }
}
