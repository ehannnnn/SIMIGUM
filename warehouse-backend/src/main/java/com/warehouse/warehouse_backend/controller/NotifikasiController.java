package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.model.Notifikasi;
import com.warehouse.warehouse_backend.repository.NotifikasiRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifikasi")
@CrossOrigin(origins = "*") 
public class NotifikasiController {

    @Autowired
    private NotifikasiRepository notifikasiRepository;

    @GetMapping("/terbaru")
    public List<Notifikasi> getNotifikasiTerbaru() {
        return notifikasiRepository.findTop20ByOrderByWaktuDesc();
    }

    
    @PutMapping("/read")
    public ResponseEntity<?> markAllAsRead() {
        List<Notifikasi> notifs = notifikasiRepository.findTop20ByOrderByWaktuDesc();
        for (Notifikasi n : notifs) {
            n.setIsRead(true);
        }
        notifikasiRepository.saveAll(notifs);
        return ResponseEntity.ok().build();
    }

    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotifikasi(@PathVariable Long id) {
        notifikasiRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}