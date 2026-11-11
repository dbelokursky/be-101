package be101.lab1.product;

import be101.lab1.product.dto.CreateProductRequest;
import be101.lab1.product.dto.ProductResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * TODO 4: допиши эндпоинты по заданию в README.
 * Проект компилируется, но пока все методы возвращают null — приложение «работает впустую».
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductMapper productMapper;

    public ProductController(ProductService productService, ProductMapper productMapper) {
        this.productService = productService;
        this.productMapper = productMapper;
    }

    @GetMapping
    public List<ProductResponse> findAll() {
        return null; // TODO: список всех продуктов как ProductResponse
    }

    @GetMapping("/{id}")
    public ProductResponse findById(@PathVariable Long id) {
        return null; // TODO: продукт по id; если нет — кинуть ProductNotFoundException
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) // TODO 5: проверь, что POST действительно отвечает 201
    public ProductResponse create(@RequestBody CreateProductRequest request) {
        return null; // TODO: request -> Product (маппер) -> сохранить -> ProductResponse
    }
}
