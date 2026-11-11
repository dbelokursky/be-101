package be101.lab4.task;

/**
 * Доменный объект. Поля совпадают с типом Task из schema.graphqls —
 * Spring GraphQL сам превратит объект в ответ по форме запроса.
 */
public record Task(
        String id,
        String title,
        boolean done,
        String projectName
) {
}
