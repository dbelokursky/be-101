package be101.lab2.task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data сам сгенерирует реализацию — и готовых методов JpaRepository,
 * и SQL по имени findByProjectId (урок 5).
 */
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);
}
