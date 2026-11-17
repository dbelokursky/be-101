package be101.lab9.task.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Готовый DTO: @NotBlank на месте — но сработает только если контроллер
 * попросит валидацию (ищите баги в TaskController).
 */
public record CreateTaskRequest(

        @NotBlank(message = "title обязателен")
        String title
) {
}
