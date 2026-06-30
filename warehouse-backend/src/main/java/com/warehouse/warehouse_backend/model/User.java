package com.warehouse.warehouse_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String namaLengkap;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private LocalDateTime createdAt;

    @Column(unique = true)
    private String email;

    private String otp;

    @Column(nullable = false)
    private boolean verified;
    
    @Column(name = "no_telepon")
    private String noTelepon;

    @Column(columnDefinition = "TEXT")
    private String alamat;
    
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String fotoProfil;
    

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}