package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String role = request.get("role"); 
        
        return ResponseEntity.ok(authService.login(username, password, role));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> request) {
        String fullName = request.get("fullName");
        String email = request.get("email");
        String username = request.get("username");
        String password = request.get("password");
        
        return ResponseEntity.ok(authService.register(fullName, email, username, password));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email"); 
        String otp = request.get("otp");
        return ResponseEntity.ok(authService.verifyOtp(email, otp));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, Object>> resendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        return ResponseEntity.ok(authService.resendOtp(email));
    }

    
    
    

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        return ResponseEntity.ok(authService.forgotPassword(username));
    }

    @PostMapping("/verify-forgot-otp")
    public ResponseEntity<Map<String, Object>> verifyForgotOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email"); 
        String otp = request.get("otp");
        return ResponseEntity.ok(authService.verifyForgotOtp(email, otp));
    }

    @PostMapping("/resend-forgot-otp")
    public ResponseEntity<Map<String, Object>> resendForgotOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        return ResponseEntity.ok(authService.resendOtp(email));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        
        return ResponseEntity.ok(authService.resetPassword(username, otp, newPassword));
    }
}