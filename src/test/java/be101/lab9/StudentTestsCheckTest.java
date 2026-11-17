package be101.lab9;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Мета-тест лабы 9: вы не только чините баги, но и закрываете их регрессией —
 * минимум ДВА @Test-метода в TaskApiStudentTest.
 */
class StudentTestsCheckTest {

    @Test
    void studentClassContainsAtLeastTwoTests() {
        int testMethods = 0;
        for (Method method : TaskApiStudentTest.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Test.class)) {
                testMethods++;
            }
        }
        assertTrue(testMethods >= 2,
                "в TaskApiStudentTest должно быть минимум два @Test-метода, найдено: " + testMethods);
    }
}
