package be101.lab2.task;

import be101.lab2.task.dto.CreateTaskRequest;
import be101.lab2.task.dto.PatchTaskRequest;
import be101.lab2.task.dto.TaskResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * TODO 6: бизнес-сердце. Методы (детали в README):
 *
 *   TaskResponse create(Long projectId, CreateTaskRequest request)   // @Transactional
 *   List<TaskResponse> findByProject(Long projectId)                 // @Transactional(readOnly = true)
 *   TaskResponse patch(Long id, PatchTaskRequest request)            // @Transactional, 404 если нет
 */
@Service
public class TaskService {
}
