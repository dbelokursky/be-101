package be101.lab9.task;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Готовый класс: Spring превратит это исключение в 404. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(Long id) {
        super("Task %d not found".formatted(id));
    }
}
