package com.babyhealth.application.usecase;

import com.babyhealth.application.port.out.AppointmentRepository;
import com.babyhealth.domain.appointments.Appointment;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AppointmentService {
    private final AppointmentRepository repo;
    public AppointmentService(AppointmentRepository repo) { this.repo = repo; }

    public Appointment schedule(UUID motherId, Appointment.Type type, Instant when) {
        Appointment a = Appointment.schedule(motherId, type, when);
        return repo.save(a);
    }

    public List<Appointment> listAll() { return repo.findAll(); }
    public List<Appointment> byMother(UUID motherId) { return repo.findByMotherId(motherId); }
}
