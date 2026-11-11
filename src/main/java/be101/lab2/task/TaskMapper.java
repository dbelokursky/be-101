package be101.lab2.task;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

/**
 * TODO 5: объяви методы маппера:
 *
 *   TaskResponse toResponse(Task task);
 *   Task toEntity(CreateTaskRequest request);
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface TaskMapper {
}
