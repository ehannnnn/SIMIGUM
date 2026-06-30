package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.model.Barang;
import com.warehouse.warehouse_backend.model.JenisTransaksi;
import com.warehouse.warehouse_backend.model.Transaksi;
import com.warehouse.warehouse_backend.model.Notifikasi; 
import com.warehouse.warehouse_backend.model.User; 
import com.warehouse.warehouse_backend.service.TransaksiService;
import com.warehouse.warehouse_backend.repository.TransaksiRepository;
import com.warehouse.warehouse_backend.repository.BarangRepository; 
import com.warehouse.warehouse_backend.repository.NotifikasiRepository; 
import com.warehouse.warehouse_backend.repository.UserRepository; 
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional; 
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173") 
@RestController
@RequestMapping("/api/transaksi")
@RequiredArgsConstructor
public class TransaksiController {

    private final TransaksiService transaksiService;
    private final TransaksiRepository transaksiRepository; 
    private final BarangRepository barangRepository; 
    private final NotifikasiRepository notifikasiRepository; 
    private final UserRepository userRepository; 

    @GetMapping
    public ResponseEntity<List<Transaksi>> getAll(
            @RequestParam(value = "jenis", required = false) JenisTransaksi jenis,
            @RequestParam(value = "userId", required = false) String userId) {
        
        if (userId != null && !userId.isEmpty() && !userId.equalsIgnoreCase("admin")) {
            return ResponseEntity.ok(transaksiService.getRiwayatByPetugas(userId));
        } else if (jenis != null) {
            return ResponseEntity.ok(transaksiService.getByJenis(jenis));
        }
        
        return ResponseEntity.ok(transaksiService.getAll());
    }

    @GetMapping("/riwayat")
    public ResponseEntity<List<Transaksi>> getRiwayat() {
        return ResponseEntity.ok(transaksiService.getRiwayat());
    }

    @GetMapping("/jenis/{jenis}")
    public ResponseEntity<List<Transaksi>> getByJenis(@PathVariable JenisTransaksi jenis) {
        return ResponseEntity.ok(transaksiService.getByJenis(jenis));
    }

    @GetMapping("/laporan")
    public ResponseEntity<List<Transaksi>> getLaporan(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) JenisTransaksi jenis) {
        return ResponseEntity.ok(transaksiService.getLaporan(start, end, jenis));
    }

    @PostMapping
    @Transactional 
    public ResponseEntity<?> create(@RequestBody Transaksi transaksi) {
        Barang barang = barangRepository.findById(transaksi.getBarang().getId())
                .orElseThrow(() -> new RuntimeException("Barang tidak ditemukan!"));

        // 2. Foto stok sebelum transaksi
        int stokSebelum = barang.getStokSaatIni(); 
        int stokSesudah = stokSebelum;

        // 3. Kalkulasi stok sesudah
        if (transaksi.getJenisTransaksi() == JenisTransaksi.MASUK) {
            stokSesudah = stokSebelum + transaksi.getJumlah();
        } else if (transaksi.getJenisTransaksi() == JenisTransaksi.KELUAR) {
            if (stokSebelum < transaksi.getJumlah()) {
                return ResponseEntity.badRequest().body("Gagal: Stok tidak mencukupi!");
            }
            stokSesudah = stokSebelum - transaksi.getJumlah();
        }

        barang.setStokSaatIni(stokSesudah);
        barangRepository.save(barang);
        transaksi.setStokSebelum(stokSebelum);
        transaksi.setStokSesudah(stokSesudah);

        Transaksi savedTransaksi = transaksiRepository.save(transaksi);
        try {
            User user = userRepository.findById(transaksi.getUser().getId()).orElse(null);
    
            String roleName = (user != null && user.getRole().name().equals("PETUGAS_GUDANG")) ? "Petugas" : "Administrator";
            String namaUser = (user != null && user.getNamaLengkap() != null) ? user.getNamaLengkap() : "Seseorang";
            
            String aksi = (savedTransaksi.getJenisTransaksi() == JenisTransaksi.MASUK) ? "memasukkan" : "mengeluarkan";
            String namaItem = (barang.getNamaBarang() != null) ? barang.getNamaBarang() : "Barang";
            String pesanAktivitas = String.format("%s %s %s %d %s %s", 
                    roleName, namaUser, aksi, savedTransaksi.getJumlah(), barang.getSatuan(), namaItem);

            Notifikasi notif = Notifikasi.builder()
                    .pesan(pesanAktivitas)
                    .waktu(LocalDateTime.now())
                    .isRead(false)
                    .transaksi(savedTransaksi)
                    .build();
            
            notifikasiRepository.save(notif);
        } catch (Exception e) {
            System.err.println("Gagal menyimpan notifikasi dari Controller: " + e.getMessage());
        }

        return ResponseEntity.ok(savedTransaksi);
    }

    @DeleteMapping("/{id}")
    @Transactional 
    public ResponseEntity<?> rollbackTransaksi(@PathVariable Long id) {
        transaksiRepository.findById(id).ifPresent(t -> {
            
            Barang barang = t.getBarang();
            
            if (t.getJenisTransaksi() == JenisTransaksi.MASUK) {
                barang.setStokSaatIni(barang.getStokSaatIni() - t.getJumlah());
            } else if (t.getJenisTransaksi() == JenisTransaksi.KELUAR) {
                barang.setStokSaatIni(barang.getStokSaatIni() + t.getJumlah());
            }
       
            barangRepository.save(barang);
            notifikasiRepository.deleteByTransaksiId(t.getId());
            transaksiRepository.delete(t);
        });
        return ResponseEntity.ok().build();
    }
}