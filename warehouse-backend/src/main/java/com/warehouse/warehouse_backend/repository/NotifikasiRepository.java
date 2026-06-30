package com.warehouse.warehouse_backend.repository;

import com.warehouse.warehouse_backend.model.Notifikasi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotifikasiRepository extends JpaRepository<Notifikasi, Long> {

    List<Notifikasi> findTop20ByOrderByWaktuDesc();

    @Modifying
    @Query("DELETE FROM Notifikasi n WHERE n.transaksi.id = :transaksiId")
    void deleteByTransaksiId(@Param("transaksiId") Long transaksiId);
}
