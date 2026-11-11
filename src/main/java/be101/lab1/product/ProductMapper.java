package be101.lab1.product;

import be101.lab1.product.dto.CreateProductRequest;
import be101.lab1.product.dto.ProductResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

/**
 * MapStruct сгенерирует реализацию при сборке: одноимённые поля
 * перекладываются автоматически (см. target/generated-sources).
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ProductMapper {

    ProductResponse toResponse(Product product);

    Product toProduct(CreateProductRequest request);
}
