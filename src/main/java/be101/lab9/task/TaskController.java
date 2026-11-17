package be101.lab9.task;

import be101.lab9.task.dto.CreateTaskRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Контроллер с ДВУМЯ инцидентами (ищите по приёмным тестам AcceptorApiTest):
 *
 *   Баг 1: создание задачи должно отвечать 201 (сейчас — как получится)
 *   Баг 2: пустой title должен отбиваться как 400 (валидация «не включена»)
 *
 * DTO с @NotBlank готов; аннотации для статуса и валидации — по смыслу из уроков.
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskStore taskStore;

    public TaskController(TaskStore taskStore) {
        this.taskStore = taskStore;
    }

    @GetMapping
    public List<Task> findAll() {
        return taskStore.findAll();
    }

    @GetMapping("/{id}")
    public Task findById(@PathVariable Long id) {
        return taskStore.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task create(@jakarta.validation.Valid @RequestBody CreateTaskRequest request) {
        return taskStore.save(request.title());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!taskStore.delete(id)) {
            throw new TaskNotFoundException(id);
        }
    }
}
