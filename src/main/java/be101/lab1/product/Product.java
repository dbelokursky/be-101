package be101.lab1.product;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Внутренний объект приложения (в лабе 2 таким станет @Entity).
 */
@Getter
@Setter
public class Product {

    private Long id;
    private String title;
    private BigDecimal price;
}
