package be101.lab2.task;

import be101.lab2.task.dto.CreateTaskRequest;
import be101.lab2.task.dto.PatchTaskRequest;
import be101.lab2.task.dto.TaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;

    public TaskService(TaskRepository taskRepository, TaskMapper taskMapper) {
        this.taskRepository = taskRepository;
        this.taskMapper = taskMapper;
    }

    @Transactional
    public TaskResponse create(Long projectId, CreateTaskRequest request) {
        Task task = taskMapper.toEntity(request);
        task.setProjectId(projectId);
        task.setDone(false);
        Task saved = taskRepository.save(task);
        return taskMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> findByProject(Long projectId) {
        return taskRepository.findByProjectId(projectId).stream()
                .map(taskMapper::toResponse)
                .toList();
    }

    @Transactional
    public TaskResponse patch(Long id, PatchTaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
        if (request.done() != null) {
            task.setDone(request.done());
        }
        return taskMapper.toResponse(task);
    }
}
