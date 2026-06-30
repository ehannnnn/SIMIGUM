package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.model.JenisTransaksi;
import com.warehouse.warehouse_backend.model.Barang;
import com.warehouse.warehouse_backend.model.Transaksi;
import com.warehouse.warehouse_backend.repository.BarangRepository;
import com.warehouse.warehouse_backend.repository.TransaksiRepository; 
import com.warehouse.warehouse_backend.service.TransaksiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final BarangRepository barangRepository;
    private final TransaksiService transaksiService;
    private final TransaksiRepository transaksiRepository; 

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam(value = "role", defaultValue = "PETUGAS") String role,
            @RequestParam(value = "userId", required = false) String userId) {
            
        Map<String, Object> data = new HashMap<>();
        boolean isAdmin = "ADMIN".equalsIgnoreCase(role);

  
        data.put("totalBarang", barangRepository.count());
        if (isAdmin) {
            data.put("barangMasukHariIni", transaksiService.countTodayByJenis(JenisTransaksi.MASUK));
            data.put("barangKeluarHariIni", transaksiService.countTodayByJenis(JenisTransaksi.KELUAR));
        } else {
            data.put("barangMasukHariIni", transaksiService.countTodayByJenisAndPetugas(JenisTransaksi.MASUK, userId));
            data.put("barangKeluarHariIni", transaksiService.countTodayByJenisAndPetugas(JenisTransaksi.KELUAR, userId));
        }

        List<Barang> stokMenipisRaw = barangRepository.findStokMenipis();
        data.put("jumlahStokMenipis", stokMenipisRaw.size());
        
        List<Map<String, Object>> daftarStokMenipisMapped = new ArrayList<>();
        for (Barang b : stokMenipisRaw) {
            Map<String, Object> mapBarang = new HashMap<>();
            mapBarang.put("id", b.getId());
            mapBarang.put("nama", b.getNamaBarang()); 
            mapBarang.put("kode", b.getKodeBarang()); 
            mapBarang.put("stok", b.getStatusStok()); 
            mapBarang.put("minStok", b.getMinimumStok()); 
            
            daftarStokMenipisMapped.add(mapBarang);
        }
        data.put("daftarStokMenipis", daftarStokMenipisMapped);

        if (isAdmin) {
            data.put("riwayatTransaksiTerbaru", transaksiService.getRiwayat());
        } else {
            data.put("riwayatTransaksiTerbaru", transaksiService.getRiwayatByPetugas(userId));
        }
        List<Map<String, Object>> grafikData = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE", new Locale("id", "ID")); // Format: Sen, Sel, Rab...

        for (int i = 6; i >= 0; i--) {
            LocalDate dateTarget = LocalDate.now().minusDays(i);
            String namaHari = dateTarget.format(formatter);

            long masuk = transaksiRepository.countByJenisTransaksiAndTanggalSelesaiAndPetugas(JenisTransaksi.MASUK, dateTarget, isAdmin, userId);
            long keluar = transaksiRepository.countByJenisTransaksiAndTanggalSelesaiAndPetugas(JenisTransaksi.KELUAR, dateTarget, isAdmin, userId);

            Map<String, Object> dayData = new HashMap<>();
            dayData.put("tanggal", namaHari);
            dayData.put("masuk", masuk);
            dayData.put("keluar", keluar);
            grafikData.add(dayData);
        }
        data.put("grafikTransaksi", grafikData);

        return ResponseEntity.ok(data);
    }
}