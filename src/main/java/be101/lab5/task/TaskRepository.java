package be101.lab5.task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Готовый репозиторий: Spring Data сгенерирует реализацию и SQL по имени метода.
 */
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);
}
