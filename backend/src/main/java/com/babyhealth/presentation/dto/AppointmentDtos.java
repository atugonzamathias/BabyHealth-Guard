package com.babyhealth.presentation.dto;

import com.babyhealth.domain.appointments.Appointment;
import java.time.Instant;
import java.util.UUID;

public class AppointmentDtos {
    public record CreateAppointmentRequest(UUID motherId, Appointment.Type type, Instant scheduledAt) {}
    public record AppointmentResponse(UUID id, UUID motherId, Appointment.Type type, Instant scheduledAt, Appointment.Status status) {}
}
