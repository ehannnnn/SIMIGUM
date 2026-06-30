package com.warehouse.warehouse_backend.dto;

import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LaporanResponseDTO {
    private long totalMasuk;
    private long totalKeluar;
    private long totalJenisBarang;
    private long stokMenipis;
    private double nilaiStok;
    private List<ChartData> chartData;
    private List<KategoriBreakdown> kategoriBreakdown;
    private List<DetailStok> detailStok;
    
    // Tambahan list untuk mengisi tabel transaksi di halaman laporan
    private List<RiwayatTransaksi> riwayatTransaksi; 

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartData {
        private String tanggal; // Format: "dd MMM" atau "MMM yyyy" agar pas di-split frontend
        private long masuk;
        private long keluar;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KategoriBreakdown {
        private String nama;
        private long jumlah;
        private double persentase;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailStok {
        private Long id;
        private String kode;
        private String nama;
        private String kategori;
        private int stok;
        private int minStok;
        private double harga;
        private String satuan;
    }

    // Tambahan Class Baru untuk Data Tabel Transaksi
  @Data
@NoArgsConstructor
@AllArgsConstructor
public static class RiwayatTransaksi {
    private Long id;
    private String kode;            // Di-mapping ke NO. TRANSAKSI (misal: "TRX-001")
    private String jenisTransaksi;  // "MASUK" atau "KELUAR"
    private String tanggal;         // Tanggal terformat dari backend
    private String namaBarang;      // Nama barang asli sebagai fallback
    private String supplier;        // Nama supplier
    private int totalItem;          // Mengisi kolom TOTAL ITEM
    private int stok;               // Mengisi kolom TOTAL QTY (jumlah transaksi)
    private double harga;           // Mengisi nilai harga satuan barang untuk hitung TOTAL NILAI
    private String satuan;          // Satuan barang (Pcs, Batang, dll)
    private String oleh;            // Mengisi kolom OLEH
}
}