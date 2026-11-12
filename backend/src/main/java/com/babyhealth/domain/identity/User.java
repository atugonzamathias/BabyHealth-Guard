package com.babyhealth.domain.identity;

import com.babyhealth.domain.shared.AggregateRoot;
import java.util.UUID;

public class User extends AggregateRoot {
    private final UUID id;
    private String email;
    private String passwordHash;
    private Role role;
    private String fullName;
    private String title;
    private String facilityId;
    private boolean active;

    public User(UUID id, String email, String passwordHash, Role role) {
        this(id, email, passwordHash, role, null, null, null);
    }

    public User(UUID id, String email, String passwordHash, Role role, String fullName, String title, String facilityId) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.fullName = fullName;
        this.title = title;
        this.facilityId = facilityId;
        this.active = true;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public String getFullName() { return fullName; }
    public String getTitle() { return title; }
    public String getFacilityId() { return facilityId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
