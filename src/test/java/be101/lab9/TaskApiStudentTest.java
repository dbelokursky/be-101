package be101.lab9;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Регрессия на исправленные инциденты: по одному тесту на каждый баг.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TaskApiStudentTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createTask_returns201AndBody() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Регрессия статуса"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Регрессия статуса"))
                .andExpect(jsonPath("$.done").value(false));
    }

    @Test
    void createTaskWithBlankTitle_returns400() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":""}
                                """))
                .andExpect(status().isBadRequest());
    }
}
