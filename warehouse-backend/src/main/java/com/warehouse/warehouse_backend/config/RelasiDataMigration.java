package com.warehouse.warehouse_backend.config;

import com.warehouse.warehouse_backend.model.Kategori;
import com.warehouse.warehouse_backend.model.Supplier;
import com.warehouse.warehouse_backend.repository.KategoriRepository;
import com.warehouse.warehouse_backend.repository.SupplierRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RelasiDataMigration implements CommandLineRunner {

    private final KategoriRepository kategoriRepository;
    private final SupplierRepository supplierRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> rows = entityManager
                    .createNativeQuery("SELECT id, kategori, supplier FROM barang")
                    .getResultList();

            for (Object[] row : rows) {
                Long barangId = ((Number) row[0]).longValue();
                String kategoriNama = row[1] != null ? row[1].toString().trim() : null;
                String supplierNama = row[2] != null ? row[2].toString().trim() : null;

                Long kategoriId = null;
                Long supplierId = null;

                if (kategoriNama != null && !kategoriNama.isEmpty()) {
                    Kategori kategori = kategoriRepository.findByNama(kategoriNama)
                            .orElseGet(() -> kategoriRepository.save(Kategori.builder().nama(kategoriNama).build()));
                    kategoriId = kategori.getId();
                }

                if (supplierNama != null && !supplierNama.isEmpty()) {
                    Supplier supplier = supplierRepository.findByNama(supplierNama)
                            .orElseGet(() -> supplierRepository.save(Supplier.builder().nama(supplierNama).build()));
                    supplierId = supplier.getId();
                }

                if (kategoriId != null || supplierId != null) {
                    entityManager.createNativeQuery("UPDATE barang SET kategori_id = COALESCE(kategori_id, :kategoriId), supplier_id = COALESCE(supplier_id, :supplierId) WHERE id = :barangId")
                            .setParameter("kategoriId", kategoriId)
                            .setParameter("supplierId", supplierId)
                            .setParameter("barangId", barangId)
                            .executeUpdate();
                }
            }
        } catch (Exception e) {
            log.info("Migrasi relasi kategori/supplier dilewati: {}", e.getMessage());
        }
    }
}
