package be101.lab9;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Приёмник лабы 9: контракт Task API. Четыре теста зелёные, ДВА — инциденты
 * из прода: они падают, пока баги в TaskController не исправлены.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AcceptorApiTest {

    @Autowired
    private MockMvc mockMvc;

    /** Создать задачу без проверки статуса и вернуть её id (статус проверяют INCIDENT-тесты). */
    private long createTaskAndGetId(String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s"}
                                """.formatted(title)))
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    // ---------- зелёная зона: это работает ----------

    @Test
    void listTasks_returns200() throws Exception {
        createTaskAndGetId("Купить молоко");
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void getTaskById_returns200AndBody() throws Exception {
        long id = createTaskAndGetId("Ревью PR");
        mockMvc.perform(get("/api/tasks/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Ревью PR"))
                .andExpect(jsonPath("$.done").value(false));
    }

    @Test
    void getMissingTask_returns404() throws Exception {
        mockMvc.perform(get("/api/tasks/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteTask_returns204() throws Exception {
        long id = createTaskAndGetId("Полить цветы");
        mockMvc.perform(delete("/api/tasks/{id}", id))
                .andExpect(status().isNoContent());
    }

    // ---------- инциденты: сейчас красные ----------

    @Test
    void createTask_INCIDENT_returns201() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Новая задача"}
                                """))
                .andExpect(status().isCreated());   // прод ждёт 201, а не 200
    }

    @Test
    void createTaskWithBlankTitle_INCIDENT_returns400() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"   "}
                                """))
                .andExpect(status().isBadRequest()); // валидация обязана отбить пустой title
    }
}
