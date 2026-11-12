package com.babyhealth.infrastructure.persistence.repository;

import com.babyhealth.infrastructure.persistence.entity.MotherEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MotherJpaRepository extends JpaRepository<MotherEntity, UUID> {
    List<MotherEntity> findByFacilityId(String facilityId);
}
