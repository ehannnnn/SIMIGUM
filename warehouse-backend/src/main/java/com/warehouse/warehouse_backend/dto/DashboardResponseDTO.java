package com.warehouse.warehouse_backend.dto;

import java.util.List;
import java.time.LocalDate;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponseDTO {
    
    // 1. Empat Kotak Stat Card Utama
    private long totalBarang;
    private long barangMasukHariIni;
    private long barangKeluarHariIni;
    private long jumlahStokMenipis;
    
    // 2. Data untuk Grafik Area (Recharts)
    private List<GrafikTransaksiDTO> grafikTransaksi;
    
    // 3. Data untuk List Stok Menipis
    private List<StokMenipisDTO> daftarStokMenipis;
    
    // 4. Data untuk Tabel Riwayat Transaksi Terbaru
    private List<RiwayatTransaksiDTO> riwayatTransaksiTerbaru;

    // ==========================================
    // SUB-DTO UNTUK GRAFIK (Recharts)
    // ==========================================
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GrafikTransaksiDTO {
        private String tanggal; // Contoh: "21 Jun", "22 Jun"
        private long masuk;
        private long keluar;
    }

    // ==========================================
    // SUB-DTO UNTUK DAFTAR STOK MENIPIS
    // ==========================================
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StokMenipisDTO {
        private Long id;
        private String nama;
        private String kode;
        private int stok;
        private int minStok;
    }

    // ==========================================
    // SUB-DTO UNTUK TABEL RIWAYAT TRANSAKSI
    // ==========================================
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiwayatTransaksiDTO {
        private Long id;
        private LocalDate tanggal;      // Otomatis ter-render format tanggal di React
        private String jenisTransaksi;  // Harus "MASUK" atau "KELUAR"
        private int jumlah;
        private BarangRingkasDTO barang; // Nested Object sesuai t.barang?.nama
        private PetugasRingkasDTO petugas; // Nested Object sesuai t.petugas?.namaLengkap
    }

    // Sub-DTO Ringkas untuk melengkapi data Riwayat Transaksi
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BarangRingkasDTO {
        private String nama;
        private String satuan; // Contoh: "Pcs", "Box", "Kg"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PetugasRingkasDTO {
        private String namaLengkap;
        private String username;
    }
}