package com.babyhealth.application.port.out;

import com.babyhealth.domain.maternal.VitalSigns;
import java.util.List;
import java.util.UUID;

public interface VitalSignsRepository {
    VitalSigns save(VitalSigns v);
    List<VitalSigns> findByMotherId(UUID motherId);
}
