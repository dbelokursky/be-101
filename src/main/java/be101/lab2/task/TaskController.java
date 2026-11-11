package be101.lab2.task;

import be101.lab2.task.dto.CreateTaskRequest;
import be101.lab2.task.dto.PatchTaskRequest;
import be101.lab2.task.dto.TaskResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * TODO 7: эндпоинты (контракт — в README и в тестах):
 *
 *   POST  /api/projects/{projectId}/tasks  → 201 + Location + тело
 *   GET   /api/projects/{projectId}/tasks  → 200 список
 *   PATCH /api/tasks/{id}                  → 200 обновлённая задача
 *
 * Подсказки: @Valid на @RequestBody, ResponseEntity для 201 с Location.
 */
@RestController
@RequestMapping("/api")
public class TaskController {
}
