package com.babyhealth.infrastructure.persistence.repository;

import com.babyhealth.infrastructure.persistence.entity.VitalSignsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface VitalSignsJpaRepository extends JpaRepository<VitalSignsEntity, UUID> {
    List<VitalSignsEntity> findByMotherId(UUID motherId);
}
