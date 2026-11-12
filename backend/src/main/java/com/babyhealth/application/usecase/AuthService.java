package com.babyhealth.application.usecase;

import com.babyhealth.application.port.out.UserRepository;
import com.babyhealth.domain.identity.Role;
import com.babyhealth.domain.identity.User;
import com.babyhealth.infrastructure.security.JwtService;
import com.babyhealth.infrastructure.security.PasswordHasher;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class AuthService {
    private final UserRepository users;
    private final JwtService jwt;

    public AuthService(UserRepository users, JwtService jwt) {
        this.users = users;
        this.jwt = jwt;
    }

    public User register(String email, String password, Role role) {
        return register(email, password, role, null, null, null);
    }

    public User register(String email, String password, Role role, String fullName, String title, String facilityId) {
        User u = new User(UUID.randomUUID(), email, PasswordHasher.hash(password), role, fullName, title, facilityId);
        return users.save(u);
    }

    public String login(String email, String password) {
        User u = users.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!PasswordHasher.matches(password, u.getPasswordHash())) throw new IllegalArgumentException("Invalid credentials");
        return jwt.generate(u.getId(), u.getEmail(), u.getRole().name());
    }
}
