package be101.lab1.product.dto;

import java.math.BigDecimal;

/**
 * DTO ответа: только то, что входит в контракт API.
 */
public record ProductResponse(
        Long id,
        String title,
        BigDecimal price
) {
}
