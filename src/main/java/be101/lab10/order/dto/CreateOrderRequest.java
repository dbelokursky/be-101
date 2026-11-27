package be101.lab10.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateOrderRequest(

        @NotBlank(message = "customer обязателен")
        String customer,

        @Positive(message = "amount должен быть положительным")
        BigDecimal amount
) {
}
