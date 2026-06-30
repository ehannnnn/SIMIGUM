package com.warehouse.warehouse_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "barang")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Barang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String namaBarang;

    @Column(nullable = false, unique = true)
    private String kodeBarang;

    @ManyToOne
    @JoinColumn(name = "kategori_id", nullable = false)
    private Kategori kategori;

    @ManyToOne
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    private String satuan;
    private String deskripsi;

    @Column(nullable = false)
    private Integer stokSaatIni;

    @Column(nullable = false)
    private Integer minimumStok;

    @Column(name = "harga")
    private Double harga;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Transient
    private String statusStok;

    public String getStatusStok() {
        if (stokSaatIni == null || minimumStok == null) return null;
        return stokSaatIni <= minimumStok ? "MENIPIS" : "NORMAL";
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
