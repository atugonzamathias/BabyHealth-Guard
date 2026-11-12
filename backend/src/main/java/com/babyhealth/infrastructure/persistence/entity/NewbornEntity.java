package com.babyhealth.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "newborns")
public class NewbornEntity {
    @Id
    private UUID id;
    @Column(name = "mother_id", nullable = false)
    private UUID motherId;
    private String name;
    private LocalDate dateOfBirth;
    private String sex;

    public NewbornEntity() {}
    public NewbornEntity(UUID id, UUID motherId, String name, LocalDate dateOfBirth, String sex) {
        this.id = id; this.motherId = motherId; this.name = name; this.dateOfBirth = dateOfBirth; this.sex = sex;
    }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getMotherId() { return motherId; }
    public void setMotherId(UUID motherId) { this.motherId = motherId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
}
