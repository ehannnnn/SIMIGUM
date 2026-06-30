package com.warehouse.warehouse_backend.repository;

import com.warehouse.warehouse_backend.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {   
    boolean existsByNama(String nama);
    Optional<Supplier> findByNama(String nama);
}