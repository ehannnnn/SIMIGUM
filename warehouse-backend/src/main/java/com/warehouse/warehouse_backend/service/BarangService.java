package com.warehouse.warehouse_backend.service;

import com.warehouse.warehouse_backend.model.Barang;
import com.warehouse.warehouse_backend.model.Kategori;
import com.warehouse.warehouse_backend.model.Notifikasi;
import com.warehouse.warehouse_backend.model.Supplier;
import com.warehouse.warehouse_backend.repository.BarangRepository;
import com.warehouse.warehouse_backend.repository.KategoriRepository;
import com.warehouse.warehouse_backend.repository.NotifikasiRepository;
import com.warehouse.warehouse_backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BarangService {

    private final BarangRepository barangRepository;
    private final KategoriRepository kategoriRepository;
    private final SupplierRepository supplierRepository;
    private final NotifikasiRepository notifikasiRepository;

    public List<Barang> getAll() {
        return barangRepository.findAll();
    }

    public Barang getById(Long id) {
        return barangRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Barang tidak ditemukan"));
    }

    public List<Barang> search(String nama) {
        return barangRepository.findByNamaBarangContainingIgnoreCase(nama);
    }

    public List<Barang> getStokMenipis() {
        return barangRepository.findStokMenipis();
    }

    public Barang create(Barang barang) {
        if (barangRepository.existsByKodeBarang(barang.getKodeBarang())) {
            throw new RuntimeException("Kode barang sudah digunakan");
        }

        Kategori kategori = kategoriRepository.findById(barang.getKategori().getId())
                .orElseThrow(() -> new RuntimeException("Kategori tidak ditemukan"));

        Supplier supplier = supplierRepository.findById(barang.getSupplier().getId())
                .orElseThrow(() -> new RuntimeException("Supplier tidak ditemukan"));

        barang.setKategori(kategori);
        barang.setSupplier(supplier);

        Barang savedBarang = barangRepository.save(barang);

        try {
            Notifikasi notif = new Notifikasi();
            notif.setPesan("Admin telah menambahkan data barang baru: " + savedBarang.getNamaBarang());
            notif.setWaktu(LocalDateTime.now());
            notif.setIsRead(false);
            notifikasiRepository.save(notif);
        } catch (Exception e) {
            System.err.println("Gagal menyimpan notifikasi tambah barang: " + e.getMessage());
        }

        return savedBarang;
    }

    public Barang update(Long id, Barang barangBaru) {
        Barang barang = getById(id);

        barang.setNamaBarang(barangBaru.getNamaBarang());
        barang.setSatuan(barangBaru.getSatuan());
        barang.setDeskripsi(barangBaru.getDeskripsi());
        barang.setMinimumStok(barangBaru.getMinimumStok());
        barang.setHarga(barangBaru.getHarga());

        if (barangBaru.getKategori() != null && barangBaru.getKategori().getId() != null) {
            Kategori kategori = kategoriRepository.findById(barangBaru.getKategori().getId())
                    .orElseThrow(() -> new RuntimeException("Kategori tidak ditemukan"));
            barang.setKategori(kategori);
        }

        if (barangBaru.getSupplier() != null && barangBaru.getSupplier().getId() != null) {
            Supplier supplier = supplierRepository.findById(barangBaru.getSupplier().getId())
                    .orElseThrow(() -> new RuntimeException("Supplier tidak ditemukan"));
            barang.setSupplier(supplier);
        }

        if (barangBaru.getStokSaatIni() != null) {
            barang.setStokSaatIni(barangBaru.getStokSaatIni());
        }

        return barangRepository.save(barang);
    }

    public void delete(Long id) {
        Barang barang = getById(id);
        barangRepository.delete(barang);
    }

    public void updateStok(Long barangId, int jumlah, boolean tambah) {
        Barang barang = getById(barangId);

        if (tambah) {
            barang.setStokSaatIni(barang.getStokSaatIni() + jumlah);
        } else {
            if (barang.getStokSaatIni() < jumlah) {
                throw new RuntimeException("Stok tidak mencukupi");
            }
            barang.setStokSaatIni(barang.getStokSaatIni() - jumlah);
        }

        barangRepository.save(barang);
    }

    public Barang getByKode(String kodeBarang) {
        return barangRepository.findByKodeBarang(kodeBarang)
                .orElseThrow(() -> new RuntimeException("Barang dengan kode " + kodeBarang + " tidak ditemukan"));
    }
}