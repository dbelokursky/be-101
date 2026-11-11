package be101.lab4.task;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Хранилище в памяти с двумя засеянными задачами. Готовый — не трогайте.
 */
@Component
public class TaskStore {

    private final Map<String, Task> store = new ConcurrentHashMap<>(Map.of(
            "1", new Task("1", "Полить цветы", true, "Дом"),
            "2", new Task("2", "Ревью PR", false, "Работа")
    ));

    public List<Task> find(Boolean done) {
        return store.values().stream()
                .filter(t -> done == null || t.done() == done)
                .toList();
    }

    /** Вернуть хранилище к исходному состоянию (используется тестами). */
    public void reset() {
        store.clear();
        store.put("1", new Task("1", "Полить цветы", true, "Дом"));
        store.put("2", new Task("2", "Ревью PR", false, "Работа"));
    }

    public Optional<Task> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    public Task complete(String id) {
        Task task = store.get(id);
        if (task == null) {
            throw new IllegalArgumentException("Task %s not found".formatted(id));
        }
        Task completed = new Task(task.id(), task.title(), true, task.projectName());
        store.put(id, completed);
        return completed;
    }
}
