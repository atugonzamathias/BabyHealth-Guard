package com.babyhealth.infrastructure.persistence.adapter;

import com.babyhealth.application.port.out.VitalSignsRepository;
import com.babyhealth.domain.maternal.VitalSigns;
import com.babyhealth.infrastructure.persistence.entity.VitalSignsEntity;
import com.babyhealth.infrastructure.persistence.repository.VitalSignsJpaRepository;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class VitalSignsRepositoryAdapter implements VitalSignsRepository {
    private final VitalSignsJpaRepository jpa;
    public VitalSignsRepositoryAdapter(VitalSignsJpaRepository jpa) { this.jpa = jpa; }

    @Override
    public VitalSigns save(VitalSigns v) {
        jpa.save(new VitalSignsEntity(v.getId(), v.getMotherId(), v.getSystolicBp(), v.getDiastolicBp(), v.getWeightKg(), v.getRecordedAt()));
        return v;
    }

    @Override
    public List<VitalSigns> findByMotherId(UUID motherId) {
        return jpa.findByMotherId(motherId).stream()
            .map(e -> new VitalSigns(e.getId(), e.getMotherId(), e.getSystolicBp(), e.getDiastolicBp(), e.getWeightKg(), e.getRecordedAt()))
            .collect(Collectors.toList());
    }
}
