package be101.lab7.order;

import java.math.BigDecimal;

public record Order(Long id, String customer, BigDecimal amount) {
}
