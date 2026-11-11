package be101.lab3;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Приёмник лабы 3: тесты проверяют КОНТРАКТ, а не код — это и есть API-First.
 * Требования к контракту — в README. mvn test зелёный = договор описан верно.
 */
class BookingContractTest {

    static Map<String, Object> spec;

    @BeforeAll
    static void loadSpec() throws IOException {
        String yaml = Files.readString(Path.of("openapi.yaml"));
        spec = new Yaml().load(yaml);
        assertNotNull(spec.get("paths"), "в спеке нет раздела paths");
    }

    @SuppressWarnings("unchecked")
    private static Object at(Object... keys) {
        Object cur = spec;
        for (Object k : keys) {
            if (!(cur instanceof Map)) return null;
            cur = ((Map<String, Object>) cur).get(String.valueOf(k));
            if (cur == null) return null;
        }
        return cur;
    }

    @Test
    void createBookingEndpointExists() {
        Object post = at("paths", "/api/bookings", "post");
        assertNotNull(post, "нет POST /api/bookings");
    }

    @Test
    @SuppressWarnings("unchecked")
    void createBookingHasBodyAndCorrectResponses() {
        Map<String, Object> post = (Map<String, Object>) at("paths", "/api/bookings", "post");
        if (post == null) fail("нет POST /api/bookings");

        Object bodyRequired = at("paths", "/api/bookings", "post", "requestBody", "required");
        assertEquals(Boolean.TRUE, bodyRequired, "requestBody у POST /api/bookings должен быть required: true");

        Map<String, Object> responses = (Map<String, Object>) post.get("responses");
        assertNotNull(responses.get("201"), "нет ответа 201 (создано)");
        assertNotNull(responses.get("400"), "нет ответа 400 (валидация)");
        assertNotNull(responses.get("409"), "нет ответа 409 (слот занят) — конфликт слотов должен быть в контракте");
    }

    @Test
    void listBookingsEndpointExists() {
        assertNotNull(at("paths", "/api/bookings", "get"), "нет GET /api/bookings (список броней)");
    }

    @Test
    void deleteBookingReturns204() {
        assertNotNull(at("paths", "/api/bookings/{id}", "delete"), "нет DELETE /api/bookings/{id}");
        assertNotNull(at("paths", "/api/bookings/{id}", "delete", "responses", "204"),
                "успешная отмена должна отвечать 204 (без тела)");
    }

    @Test
    @SuppressWarnings("unchecked")
    void createBookingRequestSchemaIsComplete() {
        Map<String, Object> schema =
                (Map<String, Object>) at("components", "schemas", "CreateBookingRequest");
        if (schema == null) fail("нет схемы CreateBookingRequest в components.schemas");

        List<String> required = (List<String>) schema.get("required");
        assertNotNull(required, "у CreateBookingRequest должен быть список required");
        for (String field : List.of("roomId", "startsAt", "endsAt")) {
            assertTrue(required.contains(field), "CreateBookingRequest.required должен содержать " + field);
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void bookingSchemaIsComplete() {
        Map<String, Object> schema =
                (Map<String, Object>) at("components", "schemas", "Booking");
        if (schema == null) fail("нет схемы Booking в components.schemas");

        List<String> required = (List<String>) schema.get("required");
        assertNotNull(required, "у Booking должен быть список required");
        for (String field : List.of("id", "roomId", "startsAt", "endsAt", "status")) {
            assertTrue(required.contains(field), "Booking.required должен содержать " + field);
        }

        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        assertNotNull(properties, "у Booking должны быть properties");
        assertNotNull(properties.get("bookedBy"), "у Booking должно быть поле bookedBy (кто забронировал)");
    }

    @Test
    @SuppressWarnings("unchecked")
    void slotConflictHasMachineCode() {
        Object example = at("paths", "/api/bookings", "post", "responses", "409",
                "content", "application/json", "example");
        assertNotNull(example, "у ответа 409 должен быть example — машина ветвится по code, человек читает title");
        Map<String, Object> ex = (Map<String, Object>) example;
        assertNotNull(ex.get("code"), "в example для 409 должен быть машинный код, например code: SLOT_TAKEN");
    }
}
