package com.warehouse.warehouse_backend.repository;

import com.warehouse.warehouse_backend.model.Kategori;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KategoriRepository extends JpaRepository<Kategori, Long> {
    boolean existsByNama(String nama);
    Optional<Kategori> findByNama(String nama);
}
