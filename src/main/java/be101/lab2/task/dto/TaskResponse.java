package be101.lab2.task.dto;

import java.time.LocalDate;

public record TaskResponse(
        Long id,
        String title,
        LocalDate deadline,
        boolean done,
        Long projectId
) {
}
