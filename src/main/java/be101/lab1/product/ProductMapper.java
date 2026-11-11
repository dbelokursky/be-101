package be101.lab1.product;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

/**
 * TODO 3: объяви два метода маппера, чтобы MapStruct сгенерировал реализацию:
 *
 *   ProductResponse toResponse(Product product);
 *   Product toProduct(CreateProductRequest request);
 *
 * Имена одноимённых полей MapStruct сопоставит сам (урок 4).
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ProductMapper {
}
