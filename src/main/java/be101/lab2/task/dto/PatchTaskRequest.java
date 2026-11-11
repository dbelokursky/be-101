package be101.lab2.task.dto;

/**
 * Boolean (обёртка): null = «не прислали», false = «прислали false».
 */
public record PatchTaskRequest(
        Boolean done
) {
}
