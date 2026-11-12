package com.babyhealth.domain.appointments;

import java.time.Instant;
import java.util.UUID;

public class Appointment {
    public enum Type { ANTENATAL, DELIVERY, IMMUNIZATION, POSTNATAL }
    public enum Status { SCHEDULED, ATTENDED, MISSED, CANCELLED }

    private final UUID id;
    private final UUID motherId;
    private final Type type;
    private Instant scheduledAt;
    private Status status;

    public Appointment(UUID id, UUID motherId, Type type, Instant scheduledAt, Status status) {
        this.id = id; this.motherId = motherId; this.type = type; this.scheduledAt = scheduledAt; this.status = status;
    }

    public static Appointment schedule(UUID motherId, Type type, Instant scheduledAt) {
        return new Appointment(UUID.randomUUID(), motherId, type, scheduledAt, Status.SCHEDULED);
    }

    public UUID getId() { return id; }
    public UUID getMotherId() { return motherId; }
    public Type getType() { return type; }
    public Instant getScheduledAt() { return scheduledAt; }
    public Status getStatus() { return status; }
    public void markMissed() { this.status = Status.MISSED; }
    public void markAttended() { this.status = Status.ATTENDED; }
}
