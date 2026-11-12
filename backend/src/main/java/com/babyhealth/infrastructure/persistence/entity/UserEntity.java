package com.babyhealth.infrastructure.persistence.entity;

import com.babyhealth.domain.identity.Role;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    private UUID id;
    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String passwordHash;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
    @Column(name = "full_name")
    private String fullName;
    @Column(name = "title")
    private String title;
    @Column(name = "facility_id")
    private String facilityId;
    private boolean active = true;

    public UserEntity() {}
    public UserEntity(UUID id, String email, String passwordHash, Role role) {
        this.id = id; this.email = email; this.passwordHash = passwordHash; this.role = role;
    }
    public UserEntity(UUID id, String email, String passwordHash, Role role, String fullName, String title, String facilityId) {
        this.id = id; this.email = email; this.passwordHash = passwordHash; this.role = role;
        this.fullName = fullName; this.title = title; this.facilityId = facilityId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getFacilityId() { return facilityId; }
    public void setFacilityId(String facilityId) { this.facilityId = facilityId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
