package be101.lab4;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник лабы 4: GraphQL живёт по POST /graphql, тело запроса — {"query": "..."}.
 * Тесты — это запросы клиента: просите ровно нужные поля и сверяйте форму ответа.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TaskGraphqlTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void tasksFilteredByDone() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"query { tasks(done: false) { title done } }\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks", hasSize(1)))
                .andExpect(jsonPath("$.data.tasks[0].title").value("Ревью PR"))
                .andExpect(jsonPath("$.data.tasks[0].done").value(false));
    }

    @Test
    void clientGetsExactlyRequestedFields() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"query { tasks { title } }\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks[0].title").exists())
                .andExpect(jsonPath("$.data.tasks[0].id").doesNotExist())
                .andExpect(jsonPath("$.data.tasks[0].done").doesNotExist());
    }

    @Test
    void nestedFieldsComeInOneQuery() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"query { tasks { title projectName } }\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks[0].title").value("Полить цветы"))
                .andExpect(jsonPath("$.data.tasks[0].projectName").value("Дом"));
    }

    @Test
    void mutationCompletesTask() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"mutation { completeTask(id: \\\"2\\\") { id done } }\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completeTask.id").value("2"))
                .andExpect(jsonPath("$.data.completeTask.done").value(true));
    }

    @Test
    void unknownFieldIsReportedInErrors() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"query { tasks { nonexistent } }\"}"))
                .andExpect(result -> {
                    // GraphQL не всегда отвечает 4xx: главное — в теле есть errors
                    String body = result.getResponse().getContentAsString();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            body.contains("errors"),
                            "ожидается описание ошибки в поле errors, получено: " + body);
                });
    }

    @Test
    void missingTaskMutationIsReportedInErrors() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"mutation { completeTask(id: \\\"999\\\") { id } }\"}"))
                .andExpect(result -> {
                    String body = result.getResponse().getContentAsString();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            body.contains("errors"),
                            "ожидается описание ошибки в поле errors, получено: " + body);
                });
    }
}
