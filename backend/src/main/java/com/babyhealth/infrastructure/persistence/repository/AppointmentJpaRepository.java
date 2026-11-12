package com.babyhealth.infrastructure.persistence.repository;

import com.babyhealth.infrastructure.persistence.entity.AppointmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AppointmentJpaRepository extends JpaRepository<AppointmentEntity, UUID> {
    List<AppointmentEntity> findByMotherId(UUID motherId);
}
