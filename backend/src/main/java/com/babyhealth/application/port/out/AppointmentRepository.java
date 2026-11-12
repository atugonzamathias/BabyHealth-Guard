package com.babyhealth.application.port.out;

import com.babyhealth.domain.appointments.Appointment;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository {
    Appointment save(Appointment a);
    List<Appointment> findByMotherId(UUID motherId);
    List<Appointment> findAll();
}
