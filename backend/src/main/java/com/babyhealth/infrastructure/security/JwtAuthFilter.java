package com.babyhealth.infrastructure.security;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class JwtAuthFilter implements Filter {
    private final JwtService jwtService;
    public JwtAuthFilter(JwtService jwtService) { this.jwtService = jwtService; }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        String path = request.getRequestURI();
        if (path.equals("/api/auth/login") || path.equals("/api/auth/register") || path.startsWith("/h2-console")) {
            chain.doFilter(req, res);
            return;
        }
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtService.isValid(token)) {
                request.setAttribute("userId", jwtService.extractSubject(token));
                request.setAttribute("role", jwtService.extractRole(token));
            } else {
                response.setStatus(401);
                response.getWriter().write("Unauthorized");
                return;
            }
        } else {
            response.setStatus(401);
            response.getWriter().write("Unauthorized");
            return;
        }
        chain.doFilter(req, res);
    }
}
