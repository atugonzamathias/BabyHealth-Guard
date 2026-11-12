package com.babyhealth.domain.alerts;

import java.time.Instant;
import java.util.UUID;

public class Alert {
    public enum Severity { LOW, MEDIUM, HIGH }

    private final UUID id;
    private final UUID motherId;
    private final String message;
    private final Severity severity;
    private boolean resolved;
    private final Instant createdAt;

    public Alert(UUID id, UUID motherId, String message, Severity severity, Instant createdAt) {
        this.id = id; this.motherId = motherId; this.message = message; this.severity = severity; this.createdAt = createdAt; this.resolved = false;
    }

    public static Alert raise(UUID motherId, String message, Severity severity) {
        return new Alert(UUID.randomUUID(), motherId, message, severity, Instant.now());
    }

    public UUID getId() { return id; }
    public UUID getMotherId() { return motherId; }
    public String getMessage() { return message; }
    public Severity getSeverity() { return severity; }
    public boolean isResolved() { return resolved; }
    public Instant getCreatedAt() { return createdAt; }
    public void resolve() { this.resolved = true; }
}
