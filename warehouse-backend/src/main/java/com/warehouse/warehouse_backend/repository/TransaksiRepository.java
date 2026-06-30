package com.warehouse.warehouse_backend.repository;

import com.warehouse.warehouse_backend.model.JenisTransaksi;
import com.warehouse.warehouse_backend.model.Transaksi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface TransaksiRepository extends JpaRepository<Transaksi, Long> {
    List<Transaksi> findByJenisTransaksi(JenisTransaksi jenis);
    List<Transaksi> findByBarangId(Long barangId);

    @Query("SELECT t FROM Transaksi t WHERE t.tanggal BETWEEN :start AND :end ORDER BY t.tanggal DESC")
    List<Transaksi> findByTanggalBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT t FROM Transaksi t WHERE t.tanggal BETWEEN :start AND :end AND t.jenisTransaksi = :jenis ORDER BY t.tanggal DESC")
    List<Transaksi> findByTanggalBetweenAndJenis(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("jenis") JenisTransaksi jenis
    );

    @Query("SELECT COUNT(t) FROM Transaksi t WHERE t.jenisTransaksi = :jenis AND DATE(t.tanggal) = CURRENT_DATE")
    Long countTodayByJenis(@Param("jenis") JenisTransaksi jenis);

    List<Transaksi> findTop10ByOrderByTanggalDesc();
    
    @Query("SELECT COUNT(t) FROM Transaksi t WHERE t.jenisTransaksi = :jenis AND t.user.username = :userId AND DATE(t.tanggal) = CURRENT_DATE")
    Long countTodayByJenisAndPetugas(@Param("jenis") JenisTransaksi jenis, @Param("userId") String userId);

    @Query("SELECT COUNT(t) FROM Transaksi t WHERE t.jenisTransaksi = :jenis AND DATE(t.tanggal) = :tanggal")
    Long countByJenisTransaksiAndTanggal(@Param("jenis") JenisTransaksi jenis, @Param("tanggal") java.time.LocalDate tanggal);
    List<Transaksi> findTop10ByUserUsernameOrderByTanggalDesc(String username);
    default long countByJenisTransaksiAndTanggalSelesaiAndPetugas(JenisTransaksi jenis, java.time.LocalDate tanggal, boolean isAdmin, String userId) {
        if (isAdmin) {
            return countByJenisTransaksiAndTanggal(jenis, tanggal);
        } else {
            return countByJenisAndTanggalAndPetugas(jenis, tanggal, userId);
        }
    }

    
    @Query("SELECT COUNT(t) FROM Transaksi t WHERE t.jenisTransaksi = :jenis AND DATE(t.tanggal) = :tanggal AND t.user.username = :userId")
    Long countByJenisAndTanggalAndPetugas(@Param("jenis") JenisTransaksi jenis, @Param("tanggal") java.time.LocalDate tanggal, @Param("userId") String userId);
}