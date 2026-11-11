package be101.lab2.task.dto;

/**
 * TODO 3: DTO создания. Поля:
 *   @NotBlank String title, java.time.LocalDate deadline
 *
 * Аннотация @NotBlank — из jakarta.validation.constraints: пустой title → 400.
 */
public record CreateTaskRequest() {
}
