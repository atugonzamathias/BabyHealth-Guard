package com.babyhealth.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "vital_signs")
public class VitalSignsEntity {
    @Id
    private UUID id;
    @Column(name = "mother_id", nullable = false)
    private UUID motherId;
    private Integer systolicBp;
    private Integer diastolicBp;
    private Double weightKg;
    private Instant recordedAt;

    public VitalSignsEntity() {}
    public VitalSignsEntity(UUID id, UUID motherId, Integer systolicBp, Integer diastolicBp, Double weightKg, Instant recordedAt) {
        this.id = id; this.motherId = motherId; this.systolicBp = systolicBp; this.diastolicBp = diastolicBp; this.weightKg = weightKg; this.recordedAt = recordedAt;
    }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getMotherId() { return motherId; }
    public void setMotherId(UUID motherId) { this.motherId = motherId; }
    public Integer getSystolicBp() { return systolicBp; }
    public void setSystolicBp(Integer systolicBp) { this.systolicBp = systolicBp; }
    public Integer getDiastolicBp() { return diastolicBp; }
    public void setDiastolicBp(Integer diastolicBp) { this.diastolicBp = diastolicBp; }
    public Double getWeightKg() { return weightKg; }
    public void setWeightKg(Double weightKg) { this.weightKg = weightKg; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
