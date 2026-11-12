package com.babyhealth.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "mothers")
public class MotherEntity {
    @Id
    private UUID id;
    @Column(nullable = false)
    private String fullName;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String facilityId;
    private UUID userId;

    public MotherEntity() {}
    public MotherEntity(UUID id, String fullName, String phoneNumber, LocalDate dateOfBirth, String facilityId, UUID userId) {
        this.id = id; this.fullName = fullName; this.phoneNumber = phoneNumber; this.dateOfBirth = dateOfBirth; this.facilityId = facilityId; this.userId = userId;
    }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getFacilityId() { return facilityId; }
    public void setFacilityId(String facilityId) { this.facilityId = facilityId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
}
