package be101.lab0.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Простейший REST-контроллер: один GET-endpoint.
 * Разберите его по схеме из урока 4: аннотации → поля → публичные методы.
 */
@RestController
public class PingController {

    @GetMapping("/api/ping")
    public Map<String, String> ping() {
        return Map.of(
                "status", "ok",
                "service", "be-101-lab-0"
        );
    }
}
