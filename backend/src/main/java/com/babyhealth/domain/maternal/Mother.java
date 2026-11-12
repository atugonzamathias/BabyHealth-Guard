package com.babyhealth.domain.maternal;

import com.babyhealth.domain.shared.AggregateRoot;
import java.time.LocalDate;
import java.util.UUID;

public class Mother extends AggregateRoot {
    private final UUID id;
    private String fullName;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String facilityId;
    private UUID userId;

    public Mother(UUID id, String fullName, String phoneNumber, LocalDate dateOfBirth, String facilityId, UUID userId) {
        this.id = id;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.dateOfBirth = dateOfBirth;
        this.facilityId = facilityId;
        this.userId = userId;
    }

    public static Mother register(String fullName, String phoneNumber, LocalDate dateOfBirth, String facilityId, UUID userId) {
        return new Mother(UUID.randomUUID(), fullName, phoneNumber, dateOfBirth, facilityId, userId);
    }

    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getPhoneNumber() { return phoneNumber; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public String getFacilityId() { return facilityId; }
    public UUID getUserId() { return userId; }
}
