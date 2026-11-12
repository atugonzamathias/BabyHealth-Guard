package com.babyhealth.domain.maternal;

import java.time.Instant;
import java.util.UUID;

public class VitalSigns {
    private final UUID id;
    private final UUID motherId;
    private Integer systolicBp;
    private Integer diastolicBp;
    private Double weightKg;
    private final Instant recordedAt;

    public VitalSigns(UUID id, UUID motherId, Integer systolicBp, Integer diastolicBp, Double weightKg, Instant recordedAt) {
        this.id = id; this.motherId = motherId; this.systolicBp = systolicBp; this.diastolicBp = diastolicBp; this.weightKg = weightKg; this.recordedAt = recordedAt;
    }

    public static VitalSigns record(UUID motherId, Integer systolicBp, Integer diastolicBp, Double weightKg) {
        return new VitalSigns(UUID.randomUUID(), motherId, systolicBp, diastolicBp, weightKg, Instant.now());
    }

    public UUID getId() { return id; }
    public UUID getMotherId() { return motherId; }
    public Integer getSystolicBp() { return systolicBp; }
    public Integer getDiastolicBp() { return diastolicBp; }
    public Double getWeightKg() { return weightKg; }
    public Instant getRecordedAt() { return recordedAt; }
}
