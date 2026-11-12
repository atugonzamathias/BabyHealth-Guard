package com.babyhealth.presentation.dto;

import java.time.LocalDate;
import java.util.UUID;

public class MotherDtos {
    public record CreateMotherRequest(String fullName, String phoneNumber, LocalDate dateOfBirth, String facilityId, UUID userId) {}
    public record MotherResponse(UUID id, String fullName, String phoneNumber, LocalDate dateOfBirth, String facilityId) {}
}
