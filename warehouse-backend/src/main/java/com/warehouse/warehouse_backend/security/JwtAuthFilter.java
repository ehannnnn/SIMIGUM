package com.warehouse.warehouse_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();

        if (
                path.startsWith("/api/auth/login") ||
                path.startsWith("/api/auth/register") ||
                path.startsWith("/api/auth/verify-otp") ||
                path.startsWith("/api/auth/resend-otp") ||
                path.startsWith("/api/auth/forgot-password") ||
                path.startsWith("/api/auth/reset-password") ||
                path.startsWith("/api/auth/verify-forgot-otp") ||
                path.startsWith("/api/auth/resend-forgot-otp") ||
                path.startsWith("/error") ||
                request.getMethod().equalsIgnoreCase("OPTIONS")
        ) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");

        String username = null;
        String token = null;

        System.out.println("\n=== DETEKTIF JWT FILTER ===");
        System.out.println("Target URL  : " + request.getRequestURI());
        System.out.println("Method      : " + request.getMethod());
        System.out.println("Auth Header : " + (authHeader != null ? authHeader : "KOSONG / NULL"));

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);

            try {
                username = jwtUtil.extractUsername(token);
                System.out.println("Username    : " + username);
            } catch (Exception e) {
                System.out.println("ERROR Ekstrak Token: " + e.getMessage());
            }
        }

        if (username != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            System.out.println("User Ditemukan di DB : " + (userDetails != null));

            boolean isValid = jwtUtil.validateToken(token);
            System.out.println("Status Token Valid?  : " + isValid);

            if (isValid) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authToken);
                System.out.println("AKSES DIIZINKAN -> Lanjut ke Controller!");
            } else {
                System.out.println("AKSES DITOLAK -> Token tidak valid / expired.");
            }
        }

        System.out.println("===========================\n");

        filterChain.doFilter(request, response);
    }
}