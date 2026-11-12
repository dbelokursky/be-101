package be101.lab7;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник лабы 7: метрики проверяются как функциональность —
 * через /actuator/metrics, как их увидел бы Prometheus.
 */
@SpringBootTest
@AutoConfigureMockMvc
class Lab7MetricsTest {

    @Autowired
    private MockMvc mockMvc;

    private void createOrder(String customer) throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customer":"%s","amount":"1990"}
                                """.formatted(customer)))
                .andExpect(status().isCreated());
    }

    @Test
    void customMetricsAppearInActuatorList() throws Exception {
        mockMvc.perform(get("/actuator/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.names", hasItem("orders.created.total")))
                .andExpect(jsonPath("$.names", hasItem("orders.create.time")));
    }

    @Test
    void counterIncrementsOnEachOrder() throws Exception {
        createOrder("ann");
        createOrder("bob");

        mockMvc.perform(get("/actuator/metrics/orders.created.total"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurements[0].value", greaterThanOrEqualTo(2.0)));
    }

    @Test
    void timerCountsCreationDuration() throws Exception {
        createOrder("carl");

        mockMvc.perform(get("/actuator/metrics/orders.create.time"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurements[?(@.statistic=='COUNT')].value",
                        hasItem(greaterThanOrEqualTo(1.0))));
    }
}
