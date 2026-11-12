package com.babyhealth.presentation.controller;

import com.babyhealth.application.usecase.MotherService;
import com.babyhealth.domain.maternal.Mother;
import com.babyhealth.presentation.dto.MotherDtos;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/mothers")
public class MotherController {
    private final MotherService service;
    public MotherController(MotherService service) { this.service = service; }

    @PostMapping
    public MotherDtos.MotherResponse create(@RequestBody MotherDtos.CreateMotherRequest req) {
        Mother m = service.register(req.fullName(), req.phoneNumber(), req.dateOfBirth(), req.facilityId(), req.userId());
        return new MotherDtos.MotherResponse(m.getId(), m.getFullName(), m.getPhoneNumber(), m.getDateOfBirth(), m.getFacilityId());
    }

    @GetMapping
    public List<MotherDtos.MotherResponse> list() {
        return service.listAll().stream()
            .map(m -> new MotherDtos.MotherResponse(m.getId(), m.getFullName(), m.getPhoneNumber(), m.getDateOfBirth(), m.getFacilityId()))
            .toList();
    }

    @GetMapping("/{id}")
    public MotherDtos.MotherResponse get(@PathVariable UUID id) {
        Mother m = service.get(id);
        return new MotherDtos.MotherResponse(m.getId(), m.getFullName(), m.getPhoneNumber(), m.getDateOfBirth(), m.getFacilityId());
    }
}
