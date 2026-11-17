package be101.lab10.order.dto;

import java.math.BigDecimal;

public record OrderResponse(
        Long id,
        String customer,
        BigDecimal amount,
        String status
) {
}
