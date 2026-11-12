package com.babyhealth.application.usecase;

import com.babyhealth.application.port.out.VitalSignsRepository;
import com.babyhealth.domain.maternal.VitalSigns;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class VitalSignsService {
    private final VitalSignsRepository repo;
    public VitalSignsService(VitalSignsRepository repo) { this.repo = repo; }

    public VitalSigns record(UUID motherId, Integer systolic, Integer diastolic, Double weight) {
        VitalSigns v = VitalSigns.record(motherId, systolic, diastolic, weight);
        return repo.save(v);
    }

    public List<VitalSigns> history(UUID motherId) { return repo.findByMotherId(motherId); }
}
