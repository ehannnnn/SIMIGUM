package com.warehouse.warehouse_backend.controller;

import com.warehouse.warehouse_backend.dto.LaporanResponseDTO;
import com.warehouse.warehouse_backend.service.LaporanService;


import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Element;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;


import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;

@RestController
@RequestMapping("/api/laporan")
@CrossOrigin(origins = "*") 
public class LaporanController {

    @Autowired
    private LaporanService laporanService;

    
    @GetMapping
    public ResponseEntity<LaporanResponseDTO> getLaporan(
            @RequestParam(value = "search", required = false, defaultValue = "") String search,
            @RequestParam(value = "jenis", required = false, defaultValue = "SEMUA") String jenis,
            @RequestParam(value = "dari") String dari,
            @RequestParam(value = "sampai") String sampai,
            @RequestParam(value = "periode", required = false, defaultValue = "mingguan") String periode) {
        
        LaporanResponseDTO data = laporanService.getLaporanData(search, jenis, dari, sampai, periode);
        return ResponseEntity.ok(data);
    }

    
    @GetMapping("/export/{format}")
    public ResponseEntity<byte[]> exportLaporan(
            @PathVariable("format") String format,
            @RequestParam(value = "search", required = false, defaultValue = "") String search,
            @RequestParam(value = "jenis", required = false, defaultValue = "SEMUA") String jenis,
            @RequestParam(value = "dari") String dari,
            @RequestParam(value = "sampai") String sampai,
            @RequestParam(value = "periode", required = false, defaultValue = "mingguan") String periode) {
        
        
        LaporanResponseDTO dataLaporan = laporanService.getLaporanData(search, jenis, dari, sampai, periode);
        
        byte[] fileContent = new byte[0]; 
        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        String fileName = "Laporan_Persediaan_" + dari + "_to_" + sampai;

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            
            if ("excel".equalsIgnoreCase(format)) {
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName += ".xlsx";
                
                Workbook workbook = new XSSFWorkbook();
                Sheet sheet = workbook.createSheet("Laporan Stok");
                
                
                Row r0 = sheet.createRow(0);
                r0.createCell(0).setCellValue("LAPORAN INVENTARIS GUDANG (WAREHOUSE)");
                Row r1 = sheet.createRow(1);
                r1.createCell(0).setCellValue("Periode: " + dari + " s/d " + sampai);
                
                
                Row r3 = sheet.createRow(3);
                r3.createCell(0).setCellValue("Total Jenis Barang: " + dataLaporan.getTotalJenisBarang());
                r3.createCell(2).setCellValue("Stok Menipis: " + dataLaporan.getStokMenipis());
                r3.createCell(4).setCellValue("Total Masuk (Filter): " + dataLaporan.getTotalMasuk());
                r3.createCell(6).setCellValue("Total Keluar (Filter): " + dataLaporan.getTotalKeluar());

                
                Row headerRow = sheet.createRow(5);
                String[] headers = {"No", "Kode Barang", "Nama Barang", "Kategori", "Stok Saat Ini", "Minimum Stok", "Satuan"};
                for (int i = 0; i < headers.length; i++) {
                    headerRow.createCell(i).setCellValue(headers[i]);
                }

                
                int rowNum = 6;
                int no = 1;
                for (LaporanResponseDTO.DetailStok item : dataLaporan.getDetailStok()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(no++);
                    row.createCell(1).setCellValue(item.getKode());
                    row.createCell(2).setCellValue(item.getNama());
                    row.createCell(3).setCellValue(item.getKategori());
                    row.createCell(4).setCellValue(item.getStok());
                    row.createCell(5).setCellValue(item.getMinStok());
                    row.createCell(6).setCellValue(item.getSatuan());
                }

                workbook.write(out);
                workbook.close();
                fileContent = out.toByteArray();

            
            } else if ("pdf".equalsIgnoreCase(format)) {
                contentType = MediaType.APPLICATION_PDF_VALUE;
                fileName += ".pdf";
                
                Document document = new Document();
                PdfWriter.getInstance(document, out);
                document.open();
                
                
                Paragraph title = new Paragraph("LAPORAN INVENTARIS GUDANG WAREHOUSE\n");
                title.setAlignment(Element.ALIGN_CENTER);
                document.add(title);
                
                document.add(new Paragraph("Periode Laporan : " + dari + " sampai " + sampai));
                document.add(new Paragraph("Filter Transaksi : " + jenis));
                document.add(new Paragraph("Ringkasan        : Total Jenis Barang (" + dataLaporan.getTotalJenisBarang() + ") | Stok Menipis (" + dataLaporan.getStokMenipis() + ")\n\n"));
                
                
                PdfPTable table = new PdfPTable(7);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1f, 2.5f, 4f, 3f, 2f, 2f, 2f}); 

                
                String[] headersPdf = {"No", "Kode", "Nama Barang", "Kategori", "Stok", "Min Stok", "Satuan"};
                for (String h : headersPdf) {
                    PdfPCell cell = new PdfPCell(new Phrase(h));
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    table.addCell(cell);
                }
                
                
                int no = 1;
                for (LaporanResponseDTO.DetailStok item : dataLaporan.getDetailStok()) {
                    table.addCell(String.valueOf(no++));
                    table.addCell(item.getKode());
                    table.addCell(item.getNama());
                    table.addCell(item.getKategori());
                    table.addCell(String.valueOf(item.getStok()));
                    table.addCell(String.valueOf(item.getMinStok()));
                    table.addCell(item.getSatuan());
                }
                
                document.add(table); 
                document.close();
                fileContent = out.toByteArray();
            }

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);
        headers.setContentType(MediaType.parseMediaType(contentType));

        return new ResponseEntity<>(fileContent, headers, HttpStatus.OK);
    }
}