package com.babyhealth.infrastructure.persistence.adapter;

import com.babyhealth.application.port.out.AppointmentRepository;
import com.babyhealth.domain.appointments.Appointment;
import com.babyhealth.infrastructure.persistence.entity.AppointmentEntity;
import com.babyhealth.infrastructure.persistence.repository.AppointmentJpaRepository;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class AppointmentRepositoryAdapter implements AppointmentRepository {
    private final AppointmentJpaRepository jpa;
    public AppointmentRepositoryAdapter(AppointmentJpaRepository jpa) { this.jpa = jpa; }

    @Override
    public Appointment save(Appointment a) {
        jpa.save(new AppointmentEntity(a.getId(), a.getMotherId(), a.getType(), a.getScheduledAt(), a.getStatus()));
        return a;
    }

    @Override
    public List<Appointment> findByMotherId(UUID motherId) {
        return jpa.findByMotherId(motherId).stream().map(this::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<Appointment> findAll() {
        return jpa.findAll().stream().map(this::toDomain).collect(Collectors.toList());
    }

    private Appointment toDomain(AppointmentEntity e) {
        Appointment a = Appointment.schedule(e.getMotherId(), e.getType(), e.getScheduledAt());
        // reflect status by re-creating via reflection-free: adjust via methods
        if (e.getStatus() == Appointment.Status.ATTENDED) a.markAttended();
        else if (e.getStatus() == Appointment.Status.MISSED) a.markMissed();
        return a;
    }
}
