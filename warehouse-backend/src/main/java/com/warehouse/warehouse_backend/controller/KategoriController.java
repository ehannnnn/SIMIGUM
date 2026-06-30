package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.model.Kategori;
import com.warehouse.warehouse_backend.repository.KategoriRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kategori")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class KategoriController {

    private final KategoriRepository kategoriRepository;

    @GetMapping
    public List<Kategori> getAll() {
        return kategoriRepository.findAll();
    }

    @PostMapping
    public Kategori create(@RequestBody Kategori kategori) {
        return kategoriRepository.save(kategori);
    }

    @PutMapping("/{id}")
    public Kategori update(@PathVariable Long id, @RequestBody Kategori kategoriBaru) {
        Kategori kategori = kategoriRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kategori tidak ditemukan"));

        kategori.setNama(kategoriBaru.getNama());

        return kategoriRepository.save(kategori);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        kategoriRepository.deleteById(id);
    }
}