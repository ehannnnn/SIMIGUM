package com.warehouse.warehouse_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaksi")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaksi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "barang_id", nullable = false)
    private Barang barang;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JenisTransaksi jenisTransaksi;

    @Column(nullable = false)
    private Integer jumlah;

    @Column(name = "stok_sebelum")
    private Integer stokSebelum;

    @Column(name = "stok_sesudah")
    private Integer stokSesudah;

    private String keterangan;

    private LocalDateTime tanggal;

    @PrePersist
    public void prePersist() {
        this.tanggal = LocalDateTime.now();
    }
}