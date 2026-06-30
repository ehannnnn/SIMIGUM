package com.warehouse.warehouse_backend.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import com.warehouse.warehouse_backend.dto.LaporanResponseDTO;
import com.warehouse.warehouse_backend.model.Barang;
import com.warehouse.warehouse_backend.model.Transaksi;
import com.warehouse.warehouse_backend.repository.BarangRepository;
import com.warehouse.warehouse_backend.repository.TransaksiRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.poi.ss.usermodel.Row;
import java.awt.Color;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LaporanService {

    @Autowired
    private BarangRepository barangRepository;

    @Autowired
    private TransaksiRepository transaksiRepository;

    public LaporanResponseDTO getLaporanData(String search, String jenis, String dari, String sampai, String periode) {
        LocalDate startDate = LocalDate.parse(dari);
        LocalDate endDate = LocalDate.parse(sampai);
        
        List<Transaksi> allTransaksi = transaksiRepository.findAll();
        List<Transaksi> filteredTransaksi = allTransaksi.stream()
                .filter(t -> {
                    LocalDate tgl = t.getTanggal().toLocalDate();
                    return !tgl.isBefore(startDate) && !tgl.isAfter(endDate);
                })
                .collect(Collectors.toList());

        if (jenis != null && !jenis.equalsIgnoreCase("SEMUA")) {
            filteredTransaksi = filteredTransaksi.stream()
                    .filter(t -> t.getJenisTransaksi().name().equalsIgnoreCase(jenis))
                    .collect(Collectors.toList());
        }

        if (search != null && !search.trim().isEmpty()) {
            String keyword = search.toLowerCase();
            filteredTransaksi = filteredTransaksi.stream()
                    .filter(t -> t.getBarang() != null && t.getBarang().getNamaBarang().toLowerCase().contains(keyword))
                    .collect(Collectors.toList());
        }

        long totalMasuk = filteredTransaksi.stream()
                .filter(t -> "MASUK".equalsIgnoreCase(t.getJenisTransaksi().name()))
                .mapToLong(Transaksi::getJumlah)
                .sum();

        long totalKeluar = filteredTransaksi.stream()
                .filter(t -> "KELUAR".equalsIgnoreCase(t.getJenisTransaksi().name()))
                .mapToLong(Transaksi::getJumlah)
                .sum();

        List<Barang> allBarang = barangRepository.findAll();
        List<Barang> filteredBarang = allBarang;
        
        if (search != null && !search.trim().isEmpty()) {
            String keyword = search.toLowerCase();
            filteredBarang = allBarang.stream()
                    .filter(b -> b.getNamaBarang().toLowerCase().contains(keyword) || 
                                 b.getKodeBarang().toLowerCase().contains(keyword) ||
                                 (b.getKategori() != null && b.getKategori().getNama() != null && b.getKategori().getNama().toLowerCase().contains(keyword)))
                    .collect(Collectors.toList());
        }

        long totalJenisBarang = filteredBarang.size();
        long stokMenipis = filteredBarang.stream()
                .filter(b -> b.getStokSaatIni() <= b.getMinimumStok())
                .count();

        double[] kalkulasiTotalAset = {0.0}; 

        List<LaporanResponseDTO.DetailStok> detailStokList = filteredBarang.stream().map(b -> {
            LaporanResponseDTO.DetailStok ds = new LaporanResponseDTO.DetailStok();
            ds.setId(b.getId());
            ds.setKode(b.getKodeBarang());
            ds.setNama(b.getNamaBarang());
            ds.setKategori(b.getKategori() != null && b.getKategori().getNama() != null ? b.getKategori().getNama() : "-"); 
            ds.setStok(b.getStokSaatIni());
            ds.setMinStok(b.getMinimumStok());
            ds.setSatuan(b.getSatuan() != null ? b.getSatuan() : "Pcs");

            double hargaBarang = (b.getHarga() != null) ? b.getHarga() : 0.0;
            ds.setHarga(hargaBarang);
            
            kalkulasiTotalAset[0] += (hargaBarang * b.getStokSaatIni());
            return ds;
        }).collect(Collectors.toList());

        double nilaiStok = kalkulasiTotalAset[0];

        long totalStokSemuaBarang = allBarang.stream().mapToLong(Barang::getStokSaatIni).sum();
        Map<String, Long> kategoriGroup = allBarang.stream()
                .filter(b -> b.getKategori() != null && b.getKategori().getNama() != null && !b.getKategori().getNama().isEmpty())
                .collect(Collectors.groupingBy(b -> b.getKategori().getNama(), Collectors.summingLong(Barang::getStokSaatIni)));

        List<LaporanResponseDTO.KategoriBreakdown> breakdownList = new ArrayList<>();
        kategoriGroup.forEach((namaKat, jumlah) -> {
            LaporanResponseDTO.KategoriBreakdown kb = new LaporanResponseDTO.KategoriBreakdown();
            kb.setNama(namaKat);
            kb.setJumlah(jumlah);
            double persentase = totalStokSemuaBarang > 0 ? Math.round(((double) jumlah / totalStokSemuaBarang) * 100.0) : 0.0;
            kb.setPersentase(persentase);
            breakdownList.add(kb);
        });

        DateTimeFormatter graphFormatter = DateTimeFormatter.ofPattern("dd MMM");
        if ("bulanan".equalsIgnoreCase(periode)) {
            graphFormatter = DateTimeFormatter.ofPattern("MMM yyyy");
        }

        final DateTimeFormatter finalFormatter = graphFormatter;
        Map<String, List<Transaksi>> groupedTx = filteredTransaksi.stream()
                .collect(Collectors.groupingBy(t -> t.getTanggal().toLocalDate().format(finalFormatter)));

        List<LaporanResponseDTO.ChartData> chartDataList = new ArrayList<>();
        groupedTx.forEach((label, txs) -> {
            LaporanResponseDTO.ChartData cd = new LaporanResponseDTO.ChartData();
            cd.setTanggal(label);
            long masuk = txs.stream().filter(t -> "MASUK".equalsIgnoreCase(t.getJenisTransaksi().name())).mapToLong(Transaksi::getJumlah).sum();
            long keluar = txs.stream().filter(t -> "KELUAR".equalsIgnoreCase(t.getJenisTransaksi().name())).mapToLong(Transaksi::getJumlah).sum();
            cd.setMasuk(masuk);
            cd.setKeluar(keluar);
            chartDataList.add(cd);
        });

        chartDataList.sort(Comparator.comparing(LaporanResponseDTO.ChartData::getTanggal));

        DateTimeFormatter tableFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");
        List<LaporanResponseDTO.RiwayatTransaksi> riwayatList = filteredTransaksi.stream().map(t -> {
            LaporanResponseDTO.RiwayatTransaksi dto = new LaporanResponseDTO.RiwayatTransaksi();
            dto.setId(t.getId());
            dto.setKode("TRX-" + String.format("%03d", t.getId())); 
            dto.setJenisTransaksi(t.getJenisTransaksi().name());

            if (t.getTanggal() != null) {
                dto.setTanggal(t.getTanggal().format(tableFormatter));
            } else {
                dto.setTanggal("-");
            }

            if (t.getBarang() != null) {
                dto.setNamaBarang(t.getBarang().getNamaBarang());
                dto.setHarga(t.getBarang().getHarga() != null ? t.getBarang().getHarga() : 0.0);
                dto.setSatuan(t.getBarang().getSatuan() != null ? t.getBarang().getSatuan() : "Pcs");
                // 🔥 PERBAIKAN: Supplier ditarik dari relasi tabel Barang (bukan di-hardcode lagi)
                dto.setSupplier(t.getBarang().getSupplier() != null && t.getBarang().getSupplier().getNama() != null ? t.getBarang().getSupplier().getNama() : "-"); 
            } else {
                dto.setNamaBarang("-");
                dto.setHarga(0.0);
                dto.setSatuan("Pcs");
                dto.setSupplier("-"); 
            }
            
            dto.setTotalItem(1);         
            dto.setStok(t.getJumlah());  

            if (t.getUser() != null) {
                dto.setOleh(t.getUser().getNamaLengkap()); 
            } else {
                dto.setOleh("-");
            }

            return dto;
        }).collect(Collectors.toList());

        LaporanResponseDTO laporan = new LaporanResponseDTO();
        laporan.setTotalMasuk(totalMasuk);
        laporan.setTotalKeluar(totalKeluar);
        laporan.setTotalJenisBarang(totalJenisBarang);
        laporan.setStokMenipis(stokMenipis);
        laporan.setNilaiStok(nilaiStok); 
        laporan.setChartData(chartDataList);
        laporan.setKategoriBreakdown(breakdownList);
        laporan.setDetailStok(detailStokList);
        laporan.setRiwayatTransaksi(riwayatList); 

        return laporan;
    }

    public byte[] exportExcel(String search, String jenis, String dari, String sampai, String periode) throws Exception {
        LaporanResponseDTO data = getLaporanData(search, jenis, dari, sampai, periode);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Laporan Transaksi");

            // Style untuk Judul
            CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("LAPORAN INVENTARIS GUDANG (SIMIGUM)");
            titleCell.setCellStyle(titleStyle);

            Row periodRow = sheet.createRow(1);
            periodRow.createCell(0).setCellValue("Periode: " + dari + " s/d " + sampai);

            // Style untuk Header Tabel (Warna Hijau)
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.SEA_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            // Style untuk Cell Data
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Header Tabel
            Row headerRow = sheet.createRow(3);
            String[] columns = {"No", "Tanggal", "No Transaksi", "Jenis", "Nama Barang", "Supplier", "Qty", "Satuan", "Harga Satuan", "Total Nilai", "Petugas"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Isi Data
            int rowIdx = 4;
            int no = 1;
            for (LaporanResponseDTO.RiwayatTransaksi trx : data.getRiwayatTransaksi()) {
                Row row = sheet.createRow(rowIdx++);
                
                Cell c0 = row.createCell(0); c0.setCellValue(no++); c0.setCellStyle(dataStyle);
                Cell c1 = row.createCell(1); c1.setCellValue(trx.getTanggal()); c1.setCellStyle(dataStyle);
                Cell c2 = row.createCell(2); c2.setCellValue(trx.getKode()); c2.setCellStyle(dataStyle);
                Cell c3 = row.createCell(3); c3.setCellValue(trx.getJenisTransaksi()); c3.setCellStyle(dataStyle);
                Cell c4 = row.createCell(4); c4.setCellValue(trx.getNamaBarang()); c4.setCellStyle(dataStyle);
                Cell c5 = row.createCell(5); c5.setCellValue(trx.getSupplier()); c5.setCellStyle(dataStyle);
                Cell c6 = row.createCell(6); c6.setCellValue(trx.getStok()); c6.setCellStyle(dataStyle);
                Cell c7 = row.createCell(7); c7.setCellValue(trx.getSatuan()); c7.setCellStyle(dataStyle);
                Cell c8 = row.createCell(8); c8.setCellValue(trx.getHarga()); c8.setCellStyle(dataStyle);
                
                Cell c9 = row.createCell(9); 
                c9.setCellValue(trx.getHarga() * trx.getStok()); 
                c9.setCellStyle(dataStyle);
                
                Cell c10 = row.createCell(10); c10.setCellValue(trx.getOleh()); c10.setCellStyle(dataStyle);
            }

            // Auto-size kolom
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ====================================================================================
    // 🔥 FUNGSI BARU: GENERATE PDF DENGAN DESAIN PROFESIONAL (OPENPDF / ITEXT)
    // ====================================================================================
    public byte[] exportPdf(String search, String jenis, String dari, String sampai, String periode) throws Exception {
        LaporanResponseDTO data = getLaporanData(search, jenis, dari, sampai, periode);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        // Format PDF Kertas A4 Landscape
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        PdfWriter.getInstance(document, out);
        document.open();

        // Font Settings
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
        Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

        // Header Dokumen
        Paragraph title = new Paragraph("LAPORAN TRANSAKSI (SIMIGUM)", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        Paragraph subtitle = new Paragraph("Periode: " + dari + " s/d " + sampai + " | Filter Jenis: " + (jenis != null ? jenis : "SEMUA"), subTitleFont);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(20);
        document.add(subtitle);

        // Desain Tabel 10 Kolom
        PdfPTable table = new PdfPTable(10);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1f, 3f, 3f, 2f, 4f, 3f, 2f, 3f, 3f, 2.5f}); // Proporsi lebar kolom

        String[] headers = {"No", "Tanggal", "Transaksi", "Jenis", "Nama Barang", "Supplier", "Qty", "Harga (Rp)", "Total Nilai (Rp)", "Oleh"};
        
        // Warna Hijau Khas SIMIGUM (Sesuai Tailwind web)
        Color emeraldColor = new Color(21, 128, 61);

        for (String head : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(head, tableHeaderFont));
            cell.setBackgroundColor(emeraldColor);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(8);
            table.addCell(cell);
        }

        // Isi Data Tabel
        int no = 1;
        for (LaporanResponseDTO.RiwayatTransaksi trx : data.getRiwayatTransaksi()) {
            PdfPCell cell;

            table.addCell(new Phrase(String.valueOf(no++), tableBodyFont));
            table.addCell(new Phrase(trx.getTanggal(), tableBodyFont));
            table.addCell(new Phrase(trx.getKode(), tableBodyFont));
            
            // Beri warna teks untuk JENIS transaksi
            Font jenisFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, "MASUK".equals(trx.getJenisTransaksi()) ? new Color(21, 128, 61) : new Color(220, 38, 38));
            table.addCell(new Phrase(trx.getJenisTransaksi(), jenisFont));
            
            table.addCell(new Phrase(trx.getNamaBarang(), tableBodyFont));
            table.addCell(new Phrase(trx.getSupplier(), tableBodyFont));
            
            cell = new PdfPCell(new Phrase(trx.getStok() + " " + trx.getSatuan(), tableBodyFont));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);

            // Format Harga ke Rupiah standar
            table.addCell(new Phrase(String.format("%,.0f", trx.getHarga()), tableBodyFont));
            table.addCell(new Phrase(String.format("%,.0f", (trx.getHarga() * trx.getStok())), tableBodyFont));
            
            table.addCell(new Phrase(trx.getOleh(), tableBodyFont));
        }

        document.add(table);
        document.close();

        return out.toByteArray();
    }
}