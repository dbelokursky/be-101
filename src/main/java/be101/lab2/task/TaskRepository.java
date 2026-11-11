package be101.lab2.task;

/**
 * TODO 1: сделай так, чтобы это стал Spring Data-репозиторий:
 *
 *   public interface TaskRepository extends JpaRepository<Task, Long> {
 *       List<Task> findByProjectId(Long projectId);
 *   }
 *
 * Урок 5 подскажет: и JpaRepository, и findByProjectId Spring сгенерирует сам.
 */
public interface TaskRepository {
}
