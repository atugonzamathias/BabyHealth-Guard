package com.babyhealth.infrastructure.persistence.adapter;

import com.babyhealth.application.port.out.MotherRepository;
import com.babyhealth.domain.maternal.Mother;
import com.babyhealth.infrastructure.persistence.entity.MotherEntity;
import com.babyhealth.infrastructure.persistence.repository.MotherJpaRepository;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class MotherRepositoryAdapter implements MotherRepository {
    private final MotherJpaRepository jpa;
    public MotherRepositoryAdapter(MotherJpaRepository jpa) { this.jpa = jpa; }

    @Override
    public Mother save(Mother m) {
        jpa.save(new MotherEntity(m.getId(), m.getFullName(), m.getPhoneNumber(), m.getDateOfBirth(), m.getFacilityId(), m.getUserId()));
        return m;
    }

    @Override
    public Optional<Mother> findById(UUID id) {
        return jpa.findById(id).map(this::toDomain);
    }

    @Override
    public List<Mother> findAll() {
        return jpa.findAll().stream().map(this::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<Mother> findByFacility(String facilityId) {
        return jpa.findByFacilityId(facilityId).stream().map(this::toDomain).collect(Collectors.toList());
    }

    private Mother toDomain(MotherEntity e) {
        return new Mother(e.getId(), e.getFullName(), e.getPhoneNumber(), e.getDateOfBirth(), e.getFacilityId(), e.getUserId());
    }
}
