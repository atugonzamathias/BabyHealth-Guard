package com.babyhealth.application.usecase;

import com.babyhealth.application.port.out.MotherRepository;
import com.babyhealth.domain.maternal.Mother;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class MotherService {
    private final MotherRepository repo;
    public MotherService(MotherRepository repo) { this.repo = repo; }

    public Mother register(String fullName, String phoneNumber, LocalDate dateOfBirth, String facilityId, UUID userId) {
        Mother m = Mother.register(fullName, phoneNumber, dateOfBirth, facilityId, userId);
        return repo.save(m);
    }

    public List<Mother> listAll() { return repo.findAll(); }
    public Mother get(UUID id) { return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Mother not found")); }
}
