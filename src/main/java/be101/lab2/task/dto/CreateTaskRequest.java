package be101.lab2.task.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateTaskRequest(

        @NotBlank(message = "title обязателен")
        String title,

        LocalDate deadline
) {
}
