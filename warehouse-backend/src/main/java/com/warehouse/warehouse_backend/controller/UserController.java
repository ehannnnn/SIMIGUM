package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.model.User;
import com.warehouse.warehouse_backend.service.UserService;
import com.warehouse.warehouse_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user") 
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    
    
    @GetMapping("/profile")
    public ResponseEntity<User> getProfile(Principal principal) {
        
        String username = principal.getName();
        return ResponseEntity.ok(userService.getByUsername(username)); 
        
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateProfile(Principal principal, @RequestBody User userDetails) {
        String username = principal.getName();
        
        User existingUser = userService.getByUsername(username);
        
        
        existingUser.setNamaLengkap(userDetails.getNamaLengkap());
        existingUser.setEmail(userDetails.getEmail());
        existingUser.setNoTelepon(userDetails.getNoTelepon());
        existingUser.setAlamat(userDetails.getAlamat());
        existingUser.setFotoProfil(userDetails.getFotoProfil()); 
        
        return ResponseEntity.ok(userService.update(existingUser.getId(), existingUser));
    }

    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(Principal principal, @RequestBody Map<String, String> passwordData) {
        String username = principal.getName();
        String oldPassword = passwordData.get("oldPassword");
        String newPassword = passwordData.get("newPassword");
        
        
        boolean success = userService.changePassword(username, oldPassword, newPassword);
        
        if (success) {
            return ResponseEntity.ok().body(Map.of("message", "Password berhasil diubah"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Password saat ini salah"));
        }
    }

    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        return ResponseEntity.ok(userService.create(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody User user) {
        return ResponseEntity.ok(userService.update(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.ok().build();
    }
}