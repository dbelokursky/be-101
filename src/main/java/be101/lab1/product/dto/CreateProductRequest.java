package be101.lab1.product.dto;

import java.math.BigDecimal;

/**
 * DTO запроса на создание: то, что присылает клиент.
 */
public record CreateProductRequest(
        String title,
        BigDecimal price
) {
}
