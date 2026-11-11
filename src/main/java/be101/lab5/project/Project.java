package be101.lab5.project;

import be101.lab5.task.Task;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Таблица projects создана миграцией v1 (готово).
 * Связь с задачами — TODO 2.
 */
@Entity
@Table(name = "projects")
@Getter
@Setter
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    /**
     * TODO 2: заменить @Transient на связь:
     *   @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
     * mappedBy — имя поля project в Task (урок «JPA и Hibernate»).
     */
    @Transient
    private List<Task> tasks = new ArrayList<>();
}
