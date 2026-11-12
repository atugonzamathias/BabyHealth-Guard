package com.babyhealth.infrastructure.persistence.entity;

import com.babyhealth.domain.appointments.Appointment;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointments")
public class AppointmentEntity {
    @Id
    private UUID id;
    @Column(name = "mother_id", nullable = false)
    private UUID motherId;
    @Enumerated(EnumType.STRING)
    private Appointment.Type type;
    private Instant scheduledAt;
    @Enumerated(EnumType.STRING)
    private Appointment.Status status;

    public AppointmentEntity() {}
    public AppointmentEntity(UUID id, UUID motherId, Appointment.Type type, Instant scheduledAt, Appointment.Status status) {
        this.id = id; this.motherId = motherId; this.type = type; this.scheduledAt = scheduledAt; this.status = status;
    }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getMotherId() { return motherId; }
    public void setMotherId(UUID motherId) { this.motherId = motherId; }
    public Appointment.Type getType() { return type; }
    public void setType(Appointment.Type type) { this.type = type; }
    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }
    public Appointment.Status getStatus() { return status; }
    public void setStatus(Appointment.Status status) { this.status = status; }
}
