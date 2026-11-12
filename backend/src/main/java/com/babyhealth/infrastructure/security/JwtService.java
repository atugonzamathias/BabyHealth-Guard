package com.babyhealth.infrastructure.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {
    private final String secret;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secret = secret;
        this.expirationMs = expirationMs;
    }

    public String generate(UUID userId, String email, String role) {
        try {
            String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
            long exp = Instant.now().getEpochSecond() + (expirationMs / 1000);
            String payload = b64("{\"sub\":\"" + userId + "\",\"email\":\"" + email + "\",\"role\":\"" + role + "\",\"exp\":" + exp + "}");
            String sig = sign(header + "." + payload);
            return header + "." + payload + "." + sig;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Map<String, Object> parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) throw new IllegalArgumentException("bad token");
            String sig = sign(parts[0] + "." + parts[1]);
            if (!sig.equals(parts[2])) throw new IllegalArgumentException("bad signature");
            String json = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            // minimal parsing: extract fields via simple string ops
            return Map.of("raw", json);
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid token");
        }
    }

    public boolean isValid(String token) {
        try { parse(token); return true; } catch (Exception e) { return false; }
    }

    public String extractSubject(String token) {
        String json = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]), StandardCharsets.UTF_8);
        return between(json, "\"sub\":\"", "\"");
    }

    public String extractRole(String token) {
        String json = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]), StandardCharsets.UTF_8);
        return between(json, "\"role\":\"", "\"");
    }

    private String between(String s, String a, String b) {
        int i = s.indexOf(a); if (i < 0) return null;
        int j = s.indexOf(b, i + a.length());
        return s.substring(i + a.length(), j);
    }

    private String b64(String s) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
