package com.warehouse.warehouse_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifikasi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notifikasi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String pesan;

    private LocalDateTime waktu;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaksi_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Transaksi transaksi;

    @PrePersist
    public void prePersist() {
        if (this.waktu == null) {
            this.waktu = LocalDateTime.now();
        }
        if (this.isRead == null) {
            this.isRead = false;
        }
    }
}
