package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.model.Barang;
import com.warehouse.warehouse_backend.service.BarangService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/barang")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BarangController {

    private final BarangService barangService;

    @GetMapping
    public ResponseEntity<List<Barang>> getAll() {
        return ResponseEntity.ok(barangService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Barang> getById(@PathVariable Long id) {
        return ResponseEntity.ok(barangService.getById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Barang>> search(@RequestParam String nama) {
        return ResponseEntity.ok(barangService.search(nama));
    }

    @GetMapping("/stok-menipis")
    public ResponseEntity<List<Barang>> stokMenipis() {
        return ResponseEntity.ok(barangService.getStokMenipis());
    }

    @GetMapping("/kode/{kodeBarang}")
    public ResponseEntity<Barang> getByKode(@PathVariable String kodeBarang) {
        return ResponseEntity.ok(barangService.getByKode(kodeBarang));
    }

    @PostMapping
    public ResponseEntity<Barang> create(@Valid @RequestBody Barang barang) {
        return ResponseEntity.status(HttpStatus.CREATED).body(barangService.create(barang));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Barang> update(@PathVariable Long id, @Valid @RequestBody Barang barang) {
        return ResponseEntity.ok(barangService.update(id, barang));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        barangService.delete(id);
        return ResponseEntity.noContent().build();
    }
}