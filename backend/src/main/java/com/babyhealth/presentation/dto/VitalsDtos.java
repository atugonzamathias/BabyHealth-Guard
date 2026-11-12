package com.babyhealth.presentation.dto;

import java.time.Instant;
import java.util.UUID;

public class VitalsDtos {
    public record CreateVitalsRequest(UUID motherId, Integer systolicBp, Integer diastolicBp, Double weightKg) {}
    public record VitalsResponse(UUID id, UUID motherId, Integer systolicBp, Integer diastolicBp, Double weightKg, Instant recordedAt) {}
}
