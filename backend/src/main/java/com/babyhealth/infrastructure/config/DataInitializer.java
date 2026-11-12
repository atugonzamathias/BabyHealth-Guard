package com.babyhealth.infrastructure.config;

import com.babyhealth.application.port.out.MotherRepository;
import com.babyhealth.application.port.out.UserRepository;
import com.babyhealth.application.port.out.VitalSignsRepository;
import com.babyhealth.domain.identity.Role;
import com.babyhealth.domain.identity.User;
import com.babyhealth.domain.maternal.Mother;
import com.babyhealth.domain.maternal.VitalSigns;
import com.babyhealth.infrastructure.security.PasswordHasher;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.util.UUID;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seed(UserRepository users, MotherRepository mothers, VitalSignsRepository vitals) {
        return args -> {
            // Seed Admin
            if (users.findByEmail("admin@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "admin@babyhealth.local",
                    PasswordHasher.hash("admin123"), Role.ADMIN, "Admin Coordinator", "Health System Administrator", "Regional Health Directorate"));
            }

            // Seed Nurse (Sr. Sarah Omondi)
            if (users.findByEmail("nurse@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "nurse@babyhealth.local",
                    PasswordHasher.hash("nurse123"), Role.NURSE, "Sr. Sarah Omondi", "Facility Nurse / Midwife", "Maji Mazuri Health Centre"));
            }
            if (users.findByEmail("sarah.omondi@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "sarah.omondi@babyhealth.local",
                    PasswordHasher.hash("nurse123"), Role.NURSE, "Sr. Sarah Omondi", "Facility Nurse / Midwife", "Maji Mazuri Health Centre"));
            }

            // Seed Midwife (Mary Wambui)
            if (users.findByEmail("midwife@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "midwife@babyhealth.local",
                    PasswordHasher.hash("midwife123"), Role.MIDWIFE, "Mary Wambui", "Certified Nurse-Midwife", "Maji Mazuri Health Centre"));
            }
            if (users.findByEmail("mary.wambui@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "mary.wambui@babyhealth.local",
                    PasswordHasher.hash("midwife123"), Role.MIDWIFE, "Mary Wambui", "Certified Nurse-Midwife", "Maji Mazuri Health Centre"));
            }

            // Seed Doctor (Dr. Anthony Karanja)
            if (users.findByEmail("doctor@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "doctor@babyhealth.local",
                    PasswordHasher.hash("doctor123"), Role.DOCTOR, "Dr. Anthony Karanja", "Medical Doctor / Obstetrician", "Sub-County Referral Hospital"));
            }
            if (users.findByEmail("dr.karanja@babyhealth.local").isEmpty()) {
                users.save(new User(UUID.randomUUID(), "dr.karanja@babyhealth.local",
                    PasswordHasher.hash("doctor123"), Role.DOCTOR, "Dr. Anthony Karanja", "Medical Doctor / Obstetrician", "Sub-County Referral Hospital"));
            }

            // Seed Initial Clinical Registry Patients if empty
            if (mothers.findAll().isEmpty()) {
                Mother m1 = mothers.save(new Mother(UUID.randomUUID(), "Zainab Bello", "+254 712 345 678", LocalDate.of(1992, 5, 14), "Maji Mazuri", null));
                vitals.save(VitalSigns.record(m1.getId(), 144, 94, 68.5));

                Mother m2 = mothers.save(new Mother(UUID.randomUUID(), "Halima Kadogo", "+254 722 987 654", LocalDate.of(1996, 8, 20), "Silanga Valley", null));
                vitals.save(VitalSigns.record(m2.getId(), 118, 76, 64.0));

                Mother m3 = mothers.save(new Mother(UUID.randomUUID(), "Grace Mwangi", "+254 733 456 789", LocalDate.of(1998, 11, 3), "Lindi Outpost", null));
                vitals.save(VitalSigns.record(m3.getId(), 112, 70, 59.5));

                Mother m4 = mothers.save(new Mother(UUID.randomUUID(), "Amina Hassan", "+254 701 234 567", LocalDate.of(1994, 2, 17), "Kibera West", null));
                vitals.save(VitalSigns.record(m4.getId(), 132, 84, 71.0));
            }
        };
    }
}
