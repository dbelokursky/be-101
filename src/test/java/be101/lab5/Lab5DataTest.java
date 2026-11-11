package be101.lab5;

import be101.lab5.project.Project;
import be101.lab5.project.ProjectRepository;
import be101.lab5.task.Task;
import be101.lab5.task.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Приёмник лабы 5: миграции, связи и каскады.
 * Четыре теста = три TODO из README: changelog v2, @Table, связи entity.
 */
@SpringBootTest
@Transactional
class Lab5DataTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Test
    void tasksTableHasExpectedColumns() {
        Integer columns = jdbc.queryForObject(
                """
                select count(*) from information_schema.columns
                where upper(table_name) = 'TASKS'
                  and upper(column_name) in ('ID', 'PROJECT_ID', 'TITLE', 'DONE')
                """,
                Integer.class);
        assertEquals(4, columns, "таблица TASKS из миграции v2 должна иметь колонки ID, PROJECT_ID, TITLE, DONE");
    }

    @Test
    void foreignKeyRejectsOrphanTasks() {
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update(
                        "insert into tasks (project_id, title, done) values (999999, 'сирота', false)"),
                "FK из миграции v2 должен отклонять задачу с несуществующим project_id");
    }

    @Test
    void relationsRoundTrip() {
        Project home = new Project();
        home.setName("Дом");
        projectRepository.save(home);

        Task task = new Task();
        task.setTitle("Купить молоко");
        task.setProject(home);
        taskRepository.save(task);

        List<Task> found = taskRepository.findByProjectId(home.getId());
        assertEquals(1, found.size(), "findByProjectId должен находить задачу проекта");
        assertEquals("Купить молоко", found.get(0).getTitle());
        assertEquals("Дом", found.get(0).getProject().getName(), "ленивая связь должна работать в транзакции");
    }

    @Test
    void cascadeRemovesProjectTasks() {
        Project work = new Project();
        work.setName("Работа");

        Task task = new Task();
        task.setTitle("Ревью PR");
        task.setProject(work);
        work.getTasks().add(task);          // связываем обе стороны

        projectRepository.save(work);       // каскад должен сохранить и задачу
        assertEquals(1, taskRepository.count(), "каскад @OneToMany должен сохранить задачу вместе с проектом");

        projectRepository.delete(work);
        assertEquals(0, taskRepository.count(), "удаление проекта должно каскадно удалить задачи");
    }
}
