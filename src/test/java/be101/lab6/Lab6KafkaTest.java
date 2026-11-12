package be101.lab6;

import be101.lab6.notification.NotificationConsumer;
import be101.lab6.order.OrderCreatedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник лабы 6: настоящий Kafka-брокер поднимается прямо в тестах
 * (EmbeddedKafka, без Docker). Три теста = полный цикл урока.
 */
@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.kafka.test.context.EmbeddedKafka(
        topics = "orders.created",
        partitions = 2)
@org.springframework.test.context.TestPropertySource(
        properties = "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}")
class Lab6KafkaTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    @Autowired
    private NotificationConsumer consumer;

    private static void await(BooleanSupplierCondition condition) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 15_000;
        while (!condition.isSatisfied()) {
            if (System.currentTimeMillis() > deadline) {
                throw new AssertionError("условие не наступило за 15 секунд — событие не дошло?");
            }
            Thread.sleep(200);
        }
    }

    private interface BooleanSupplierCondition {
        boolean isSatisfied();
    }

    @Test
    void manuallyPublishedEventReachesConsumer() throws Exception {
        consumer.clear();
        kafkaTemplate.send("orders.created", "1",
                new OrderCreatedEvent(1L, "ann", new BigDecimal("1500"))).get();

        await(() -> !consumer.received().isEmpty());

        OrderCreatedEvent event = consumer.received().get(0);
        assertEquals("ann", event.customer());
        assertEquals(new BigDecimal("1500"), event.amount());
    }

    @Test
    void controllerPublishesEventToTopic() throws Exception {
        consumer.clear();
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customer":"bob","amount":"4200"}
                                """))
                .andExpect(status().isCreated());

        await(() -> !consumer.received().isEmpty());

        OrderCreatedEvent event = consumer.received().get(0);
        assertEquals("bob", event.customer());
        assertEquals(new BigDecimal("4200"), event.amount());
    }

    @Test
    void eventsOfSameKeyKeepOrder() throws Exception {
        consumer.clear();
        String key = "42";
        kafkaTemplate.send("orders.created", key, new OrderCreatedEvent(42L, "ann", BigDecimal.ONE)).get();
        kafkaTemplate.send("orders.created", key, new OrderCreatedEvent(42L, "ann", BigDecimal.TEN)).get();

        await(() -> consumer.received().size() == 2);

        assertEquals(BigDecimal.ONE, consumer.received().get(0).amount(), "первое событие ключа должно прийти первым");
        assertEquals(BigDecimal.TEN, consumer.received().get(1).amount());
    }
}
