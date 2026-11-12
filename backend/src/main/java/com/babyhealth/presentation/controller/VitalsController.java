package com.babyhealth.presentation.controller;

import com.babyhealth.application.usecase.VitalSignsService;
import com.babyhealth.domain.maternal.VitalSigns;
import com.babyhealth.presentation.dto.VitalsDtos;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vitals")
public class VitalsController {
    private final VitalSignsService service;
    public VitalsController(VitalSignsService service) { this.service = service; }

    @PostMapping
    public VitalsDtos.VitalsResponse create(@RequestBody VitalsDtos.CreateVitalsRequest req) {
        VitalSigns v = service.record(req.motherId(), req.systolicBp(), req.diastolicBp(), req.weightKg());
        return new VitalsDtos.VitalsResponse(v.getId(), v.getMotherId(), v.getSystolicBp(), v.getDiastolicBp(), v.getWeightKg(), v.getRecordedAt());
    }

    @GetMapping("/mother/{motherId}")
    public List<VitalsDtos.VitalsResponse> history(@PathVariable UUID motherId) {
        return service.history(motherId).stream()
            .map(v -> new VitalsDtos.VitalsResponse(v.getId(), v.getMotherId(), v.getSystolicBp(), v.getDiastolicBp(), v.getWeightKg(), v.getRecordedAt()))
            .toList();
    }
}
