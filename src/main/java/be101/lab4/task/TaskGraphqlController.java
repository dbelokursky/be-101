package be101.lab4.task;

import org.springframework.stereotype.Controller;

/**
 * TODO: обслужить схему из src/main/resources/graphql/schema.graphqls:
 *
 *   @QueryMapping
 *   public List<Task> tasks(@Argument Boolean done) { ... }
 *
 *   @QueryMapping
 *   public Task task(@Argument String id) { ... }
 *
 *   @MutationMapping
 *   public Task completeTask(@Argument String id) { ... }
 *
 * Аннотации: org.springframework.graphql.data.method.annotation.*
 * Контракт менять нельзя — только его исполнение.
 */
@Controller
public class TaskGraphqlController {

    // TODO: три метода из схемы — и 6 тестов станут зелёными
}
