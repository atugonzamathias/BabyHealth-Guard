package com.babyhealth.presentation.controller;

import com.babyhealth.application.port.out.UserRepository;
import com.babyhealth.application.usecase.AuthService;
import com.babyhealth.domain.identity.Role;
import com.babyhealth.domain.identity.User;
import com.babyhealth.presentation.dto.AuthDtos;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final UserRepository users;

    public AuthController(AuthService auth, UserRepository users) {
        this.auth = auth;
        this.users = users;
    }

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@RequestBody AuthDtos.RegisterRequest req) {
        Role role;
        try {
            role = Role.valueOf(req.role() == null ? "HEALTH_WORKER" : req.role().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            role = Role.HEALTH_WORKER;
        }
        User u = auth.register(req.email(), req.password(), role, req.fullName(), req.title(), req.facilityId());
        String token = auth.login(req.email(), req.password());
        return new AuthDtos.AuthResponse(token, u.getRole().name(), u.getEmail(), u.getFullName(), u.getTitle(), u.getFacilityId());
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@RequestBody AuthDtos.LoginRequest req) {
        String token = auth.login(req.email(), req.password());
        User u = users.findByEmail(req.email()).orElseThrow();
        return new AuthDtos.AuthResponse(token, u.getRole().name(), u.getEmail(), u.getFullName(), u.getTitle(), u.getFacilityId());
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest req) {
        String uid = (String) req.getAttribute("userId");
        if (uid == null) throw new IllegalArgumentException("Unauthorized");
        User u = users.findById(UUID.fromString(uid)).orElseThrow(() -> new IllegalArgumentException("User not found"));
        Map<String, Object> map = new HashMap<>();
        map.put("id", u.getId().toString());
        map.put("email", u.getEmail());
        map.put("role", u.getRole().name());
        map.put("fullName", (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : formatDefaultName(u.getEmail()));
        map.put("title", (u.getTitle() != null && !u.getTitle().isBlank()) ? u.getTitle() : formatRoleTitle(u.getRole()));
        map.put("facilityId", u.getFacilityId() != null ? u.getFacilityId() : "Maji Mazuri Health Centre");
        return map;
    }

    private String formatDefaultName(String email) {
        String namePart = email.split("@")[0].replace(".", " ");
        String[] words = namePart.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1)).append(" ");
            }
        }
        return sb.toString().trim();
    }

    private String formatRoleTitle(Role r) {
        return switch (r) {
            case NURSE -> "Facility Nurse / Midwife";
            case MIDWIFE -> "Registered Midwife";
            case DOCTOR -> "Medical Doctor / Obstetrician";
            case HEALTH_WORKER -> "Community Health Worker (CHW)";
            case ADMIN -> "Health System Administrator";
            case MOTHER -> "Patient / Expectant Mother";
        };
    }

    @GetMapping("/users")
    public List<Map<String, String>> users() {
        return users.findAll().stream()
            .map(u -> {
                Map<String, String> m = new HashMap<>();
                m.put("id", u.getId().toString());
                m.put("email", u.getEmail());
                m.put("role", u.getRole().name());
                m.put("fullName", (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : formatDefaultName(u.getEmail()));
                m.put("title", (u.getTitle() != null && !u.getTitle().isBlank()) ? u.getTitle() : formatRoleTitle(u.getRole()));
                m.put("facilityId", u.getFacilityId() != null ? u.getFacilityId() : "Maji Mazuri Health Centre");
                return m;
            })
            .toList();
    }
}
