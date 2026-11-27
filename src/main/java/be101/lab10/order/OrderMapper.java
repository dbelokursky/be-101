package be101.lab10.order;

import be101.lab10.order.dto.CreateOrderRequest;
import be101.lab10.order.dto.OrderResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface OrderMapper {

    OrderResponse toResponse(Order order);

    Order toEntity(CreateOrderRequest request);
}
