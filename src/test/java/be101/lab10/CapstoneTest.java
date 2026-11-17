package be101.lab10;

import be101.lab10.order.OrderCreatedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.http.MediaType;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник capstone-лабы: один прогон проверяет весь курс —
 * REST-контракт, валидацию, персистентность, событие в Kafka и бизнес-метрику.
 */
@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.kafka.test.context.EmbeddedKafka(topics = "orders.created")
@org.springframework.test.context.TestPropertySource(
        properties = "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}")
class CapstoneTest {

    /** Наблюдатель за топиком: ловит событие вашего продюсера (лаба 6). */
    @TestConfiguration
    static class KafkaObserver {

        final CountDownLatch latch = new CountDownLatch(1);
        final List<OrderCreatedEvent> received = new CopyOnWriteArrayList<>();

        @KafkaListener(topics = "orders.created", groupId = "capstone-observer")
        void onOrderCreated(OrderCreatedEvent event) {
            received.add(event);
            latch.countDown();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private KafkaObserver observer;

    private void createOrder(String customer, String amount) throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customer":"%s","amount":"%s"}
                                """.formatted(customer, amount)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customer").value(customer))
                .andExpect(jsonPath("$.status").value("NEW"));
    }

    @Test
    void createOrder_returns201AndPersists() throws Exception {
        createOrder("ann", "1990");

        // сохранилось в базе (через таблицу из Liquibase) — видно списком
        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void createOrder_publishesKafkaEvent() throws Exception {
        createOrder("bob", "4200");
        boolean arrived = observer.latch.await(15, TimeUnit.SECONDS);
        assertThat(arrived).as("событие orders.created должно прийти в Kafka").isTrue();
        assertThat(observer.received).anySatisfy(e -> {
            assertThat(e.customer()).isEqualTo("bob");
            assertThat(e.amount()).isEqualByComparingTo("4200");
        });
    }

    @Test
    void createOrder_incrementsBusinessMetric() throws Exception {
        createOrder("carl", "100");

        mockMvc.perform(get("/actuator/metrics/orders.created.total"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurements[0].value", greaterThanOrEqualTo(1.0)));
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
}
