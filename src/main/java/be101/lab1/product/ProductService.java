package be101.lab1.product;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Хранилище «в памяти»: без базы, чтобы фокус лабы — контроллер, DTO и маппер.
 * Этот класс готовый — менять его не нужно.
 */
@Service
public class ProductService {

    private final AtomicLong sequence = new AtomicLong();
    private final Map<Long, Product> store = new ConcurrentHashMap<>();

    public List<Product> findAll() {
        return List.copyOf(store.values());
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public Product save(Product product) {
        product.setId(sequence.incrementAndGet());
        store.put(product.getId(), product);
        return product;
    }
}
