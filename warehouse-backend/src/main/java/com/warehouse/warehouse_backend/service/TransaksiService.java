package com.warehouse.warehouse_backend.service;

import com.warehouse.warehouse_backend.model.User;
import com.warehouse.warehouse_backend.model.Barang;
import com.warehouse.warehouse_backend.model.JenisTransaksi;
import com.warehouse.warehouse_backend.model.Transaksi;
import com.warehouse.warehouse_backend.model.Notifikasi; 
import com.warehouse.warehouse_backend.repository.BarangRepository;
import com.warehouse.warehouse_backend.repository.TransaksiRepository;
import com.warehouse.warehouse_backend.repository.UserRepository;
import com.warehouse.warehouse_backend.repository.NotifikasiRepository; 
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransaksiService {

    private final TransaksiRepository transaksiRepository;
    private final BarangRepository barangRepository;
    private final UserRepository userRepository;
    private final BarangService barangService;
    private final NotifikasiRepository notifikasiRepository; 

    public List<Transaksi> getAll() {
        return transaksiRepository.findAll();
    }

    public List<Transaksi> getRiwayat() {
        return transaksiRepository.findTop10ByOrderByTanggalDesc();
    }

    public List<Transaksi> getByJenis(JenisTransaksi jenis) {
        return transaksiRepository.findByJenisTransaksi(jenis);
    }

    public List<Transaksi> getLaporan(LocalDateTime start, LocalDateTime end, JenisTransaksi jenis) {
        if (jenis != null) {
            return transaksiRepository.findByTanggalBetweenAndJenis(start, end, jenis);
        }
        return transaksiRepository.findByTanggalBetween(start, end);
    }

    @Transactional
    public Transaksi create(Transaksi transaksi) {
        // Ambil data barang & user lengkap dari DB
        Barang barang = barangRepository.findById(transaksi.getBarang().getId())
                .orElseThrow(() -> new RuntimeException("Barang tidak ditemukan"));
        User user = userRepository.findById(transaksi.getUser().getId())
                .orElseThrow(() -> new RuntimeException("User tidak ditemukan"));

        boolean tambah = transaksi.getJenisTransaksi() == JenisTransaksi.MASUK;
        barangService.updateStok(barang.getId(), transaksi.getJumlah(), tambah);

        transaksi.setBarang(barang);
        transaksi.setUser(user);

        Transaksi savedTransaksi = transaksiRepository.save(transaksi);
        try {
            System.out.println(">>> [1] MEMULAI PROSES PEMBUATAN NOTIFIKASI...");

            String namaUser = (user.getNamaLengkap() != null) ? user.getNamaLengkap() : user.getUsername();
            String aksi = (savedTransaksi.getJenisTransaksi() == JenisTransaksi.MASUK) ? "memasukkan" : "mengeluarkan";
            String namaItem = (barang.getNamaBarang() != null) ? barang.getNamaBarang() : "Barang";

            System.out.println(">>> [2] NAMA BARANG DITEMUKAN: " + namaItem);

            String pesanAktivitas = String.format("%s %s %d %s %s", 
                    namaUser, aksi, savedTransaksi.getJumlah(), barang.getSatuan(), namaItem
            );

            System.out.println(">>> [3] PESAN NOTIFIKASI: " + pesanAktivitas);

            Notifikasi notif = Notifikasi.builder()
                    .pesan(pesanAktivitas)
                    .waktu(LocalDateTime.now())
                    .isRead(false)
                    .transaksi(savedTransaksi)
                    .build();

            notifikasiRepository.save(notif);
            
            System.out.println(">>> [4] NOTIFIKASI BERHASIL MASUK DATABASE!");
        } catch (Exception e) {
            System.err.println(">>> [ERROR] GAGAL MENYIMPAN NOTIFIKASI: " + e.getMessage());
            e.printStackTrace();
        }

        return savedTransaksi;
    }

    public Long countTodayByJenis(JenisTransaksi jenis) {
        return transaksiRepository.countTodayByJenis(jenis);
    }

    public Long countTodayByJenisAndPetugas(JenisTransaksi jenis, String userId) {
        return transaksiRepository.countTodayByJenisAndPetugas(jenis, userId);
    }

    public List<Transaksi> getRiwayatByPetugas(String userId) {
        return transaksiRepository.findTop10ByUserUsernameOrderByTanggalDesc(userId);
    }
}