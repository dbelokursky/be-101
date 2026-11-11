package be101.lab2.task;

import be101.lab2.task.dto.CreateTaskRequest;
import be101.lab2.task.dto.TaskResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface TaskMapper {

    TaskResponse toResponse(Task task);

    Task toEntity(CreateTaskRequest request);
}
