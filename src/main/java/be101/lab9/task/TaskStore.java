package be101.lab9.task;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/** Готовое in-memory хранилище: без базы — фокус лабы на HTTP-границе. */
@Component
public class TaskStore {

    private final AtomicLong sequence = new AtomicLong();
    private final Map<Long, Task> store = new ConcurrentHashMap<>();

    public Task save(String title) {
        long id = sequence.incrementAndGet();
        Task task = new Task(id, title, false);
        store.put(id, task);
        return task;
    }

    public List<Task> findAll() {
        return List.copyOf(store.values());
    }

    public Optional<Task> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public boolean delete(Long id) {
        return store.remove(id) != null;
    }
}
