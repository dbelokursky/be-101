package be101.lab2.task;

import be101.lab2.task.dto.CreateTaskRequest;
import be101.lab2.task.dto.PatchTaskRequest;
import be101.lab2.task.dto.TaskResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<TaskResponse> create(@PathVariable Long projectId,
                                               @Valid @RequestBody CreateTaskRequest request) {
        TaskResponse created = taskService.create(projectId, request);
        return ResponseEntity
                .created(URI.create("/api/tasks/" + created.id()))
                .body(created);
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<TaskResponse> findByProject(@PathVariable Long projectId) {
        return taskService.findByProject(projectId);
    }

    @PatchMapping("/tasks/{id}")
    public TaskResponse patch(@PathVariable Long id, @RequestBody PatchTaskRequest request) {
        return taskService.patch(id, request);
    }
}
