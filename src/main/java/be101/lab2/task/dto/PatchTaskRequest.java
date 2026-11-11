package be101.lab2.task.dto;

/**
 * TODO 4: DTO частичного обновления. Поле одно:
 *   Boolean done
 *
 * Boolean (обёртка!), чтобы отличить «не прислали» (null) от «прислали false».
 */
public record PatchTaskRequest() {
}
