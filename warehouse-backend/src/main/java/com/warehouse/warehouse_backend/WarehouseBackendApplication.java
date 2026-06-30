package com.warehouse.warehouse_backend;

import com.warehouse.warehouse_backend.model.Role;
import com.warehouse.warehouse_backend.model.User;
import com.warehouse.warehouse_backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class WarehouseBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(WarehouseBackendApplication.class, args);
    }
    
    @Bean
    public CommandLineRunner initAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByUsername("admin").isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123")); 
                
                admin.setNamaLengkap("Administrator Utama");
                admin.setRole(Role.ADMIN); 
                
                admin.setEmail("admin@warehouse.com");
                admin.setVerified(true);
                
                userRepository.save(admin);
                System.out.println("====== AKUN ADMIN BERHASIL DIBUAT OTOMATIS OLEH SPRING BOOT ======");
            }
        };
    }
}