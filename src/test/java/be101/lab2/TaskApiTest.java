package be101.lab2;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник лабы 2: контракт API, записанный в тестах.
 * Сейчас они красные — задача лабы сделать их зелёными (`mvn test`).
 * Тесты менять нельзя (в реальных командах их пишет тот, кто ждёт ваш API).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TaskApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createTaskReturns201WithBodyAndLocation() throws Exception {
        mockMvc.perform(post("/api/projects/7/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Купить молоко","deadline":"2026-12-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/tasks/")))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Купить молоко"))
                .andExpect(jsonPath("$.deadline").value("2026-12-01"))
                .andExpect(jsonPath("$.done").value(false))
                .andExpect(jsonPath("$.projectId").value(7));
    }

    @Test
    void createdTaskAppearsInProjectList() throws Exception {
        createTask("Купить молоко");

        mockMvc.perform(get("/api/projects/7/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void completeTaskMarksItDone() throws Exception {
        long id = createTaskAndGetId("Полить цветы");

        mockMvc.perform(patch("/api/tasks/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"done":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.done").value(true));
    }

    @Test
    void createWithoutTitleReturns400() throws Exception {
        mockMvc.perform(post("/api/projects/7/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deadline":"2026-12-01"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void patchMissingTaskReturns404() throws Exception {
        mockMvc.perform(patch("/api/tasks/999999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"done":true}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    // ---------- вспомогательные ----------

    private void createTask(String title) throws Exception {
        mockMvc.perform(post("/api/projects/7/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","deadline":"2026-12-01"}
                                """.formatted(title)))
                .andExpect(status().isCreated());
    }

    private long createTaskAndGetId(String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects/7/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s"}
                                """.formatted(title)))
                .andExpect(status().isCreated())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }
}
