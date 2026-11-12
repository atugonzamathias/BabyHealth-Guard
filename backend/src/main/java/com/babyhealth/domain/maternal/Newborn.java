package com.babyhealth.domain.maternal;

import java.time.LocalDate;
import java.util.UUID;

public class Newborn {
    private final UUID id;
    private final UUID motherId;
    private String name;
    private LocalDate dateOfBirth;
    private String sex;

    public Newborn(UUID id, UUID motherId, String name, LocalDate dateOfBirth, String sex) {
        this.id = id; this.motherId = motherId; this.name = name; this.dateOfBirth = dateOfBirth; this.sex = sex;
    }

    public static Newborn register(UUID motherId, String name, LocalDate dateOfBirth, String sex) {
        return new Newborn(UUID.randomUUID(), motherId, name, dateOfBirth, sex);
    }

    public UUID getId() { return id; }
    public UUID getMotherId() { return motherId; }
    public String getName() { return name; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public String getSex() { return sex; }
}
