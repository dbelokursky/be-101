package be101.lab5.task;

import be101.lab5.project.Project;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.Setter;

/**
 * TODO 1: привязать к таблице tasks из вашей миграции v2 — сейчас дефолтное
 * имя таблицы (task) не совпадает с базой:
 *   @Table(name = "tasks")   — раскомментируйте/добавьте над классом
 *
 * TODO 3: владелец связи с проектом (FK project_id живёт в tasks — урок 2):
 *   @ManyToOne(fetch = FetchType.LAZY)
 *   @JoinColumn(name = "project_id")
 */
@Entity
// TODO 1: @Table(name = "tasks")
@Getter
@Setter
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private boolean done;

    /** TODO 3: заменить @Transient на @ManyToOne(LAZY) + @JoinColumn(name = "project_id") */
    @Transient
    private Project project;
}
