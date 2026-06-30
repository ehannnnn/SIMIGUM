package com.warehouse.warehouse_backend.repository;

import com.warehouse.warehouse_backend.model.Barang;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface BarangRepository extends JpaRepository<Barang, Long> {
    Optional<Barang> findByKodeBarang(String kodeBarang);
    boolean existsByKodeBarang(String kodeBarang);
    List<Barang> findByNamaBarangContainingIgnoreCase(String nama);

    @Query("SELECT b FROM Barang b WHERE b.stokSaatIni <= b.minimumStok")
    List<Barang> findStokMenipis();
    
}