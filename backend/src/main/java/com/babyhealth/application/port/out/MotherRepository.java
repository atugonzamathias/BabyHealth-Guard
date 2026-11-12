package com.babyhealth.application.port.out;

import com.babyhealth.domain.maternal.Mother;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MotherRepository {
    Mother save(Mother mother);
    Optional<Mother> findById(UUID id);
    List<Mother> findAll();
    List<Mother> findByFacility(String facilityId);
}
