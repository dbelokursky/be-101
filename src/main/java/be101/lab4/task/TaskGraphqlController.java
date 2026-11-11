package be101.lab4.task;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

/**
 * Исполнение контракта из schema.graphqls:
 * каждое поле Query/Mutation — метод с соответствующей аннотацией.
 */
@Controller
public class TaskGraphqlController {

    private final TaskStore taskStore;

    public TaskGraphqlController(TaskStore taskStore) {
        this.taskStore = taskStore;
    }

    @QueryMapping
    public List<Task> tasks(@Argument Boolean done) {
        return taskStore.find(done);
    }

    @QueryMapping
    public Task task(@Argument String id) {
        return taskStore.findById(id).orElse(null);
    }

    @MutationMapping
    public Task completeTask(@Argument String id) {
        return taskStore.complete(id);
    }
}
