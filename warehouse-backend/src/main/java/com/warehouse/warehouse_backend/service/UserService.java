package com.warehouse.warehouse_backend.service;

import com.warehouse.warehouse_backend.model.User;
import com.warehouse.warehouse_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder; 
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; 

    public List<User> getAll() {
        return userRepository.findAll();
    }

    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User tidak ditemukan"));
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User dengan username '" + username + "' tidak ditemukan"));
    }

    public boolean changePassword(String username, String oldPassword, String newPassword) {
        User user = getByUsername(username);
        
        
        if (passwordEncoder.matches(oldPassword, user.getPassword())) {
            
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return true;
        }

        return false;
    }

    public User create(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username sudah digunakan");
        }
      
        
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setVerified(true); 
        return userRepository.save(user);
    }

    public User update(Long id, User userBaru) {
        User user = getById(id);
        user.setNamaLengkap(userBaru.getNamaLengkap());
        
        if (userBaru.getRole() != null) {
            user.setRole(userBaru.getRole());
        }
        
        if (userBaru.getUsername() != null) user.setUsername(userBaru.getUsername());
        if (userBaru.getEmail() != null) user.setEmail(userBaru.getEmail());
        user.setVerified(userBaru.isVerified()); 
        
        if (userBaru.getNoTelepon() != null) user.setNoTelepon(userBaru.getNoTelepon());
        if (userBaru.getAlamat() != null) user.setAlamat(userBaru.getAlamat());
        if (userBaru.getFotoProfil() != null) user.setFotoProfil(userBaru.getFotoProfil());

        if (userBaru.getPassword() != null && !userBaru.getPassword().trim().isEmpty()) {
            
            user.setPassword(passwordEncoder.encode(userBaru.getPassword()));
        }

        return userRepository.save(user);
    }

    public void delete(Long id) {
        User user = getById(id);
        userRepository.delete(user);
    }
}