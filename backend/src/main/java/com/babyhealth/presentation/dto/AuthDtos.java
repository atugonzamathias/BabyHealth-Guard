package com.babyhealth.presentation.dto;

public class AuthDtos {
    public record RegisterRequest(String email, String password, String role, String fullName, String title, String facilityId) {}
    public record LoginRequest(String email, String password) {}
    public record AuthResponse(String token, String role, String email, String fullName, String title, String facilityId) {
        public AuthResponse(String token) {
            this(token, null, null, null, null, null);
        }
    }
}
