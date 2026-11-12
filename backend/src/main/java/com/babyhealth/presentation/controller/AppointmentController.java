package com.babyhealth.presentation.controller;

import com.babyhealth.application.usecase.AppointmentService;
import com.babyhealth.domain.appointments.Appointment;
import com.babyhealth.presentation.dto.AppointmentDtos;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {
    private final AppointmentService service;
    public AppointmentController(AppointmentService service) { this.service = service; }

    @PostMapping
    public AppointmentDtos.AppointmentResponse create(@RequestBody AppointmentDtos.CreateAppointmentRequest req) {
        Appointment a = service.schedule(req.motherId(), req.type(), req.scheduledAt());
        return new AppointmentDtos.AppointmentResponse(a.getId(), a.getMotherId(), a.getType(), a.getScheduledAt(), a.getStatus());
    }

    @GetMapping
    public List<AppointmentDtos.AppointmentResponse> list() {
        return service.listAll().stream()
            .map(a -> new AppointmentDtos.AppointmentResponse(a.getId(), a.getMotherId(), a.getType(), a.getScheduledAt(), a.getStatus()))
            .toList();
    }
}
