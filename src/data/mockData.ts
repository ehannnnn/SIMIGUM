import { Barang, Transaksi, UserData } from '../types';

export const mockBarang: Barang[] = [
  { id: '1', kode: 'BRG001', nama: 'Kertas HVS A4 70gr', kategori: 'Alat Tulis', satuan: 'Rim', stok: 12, minStok: 20, harga: 45000, createdAt: '2024-01-10' },
  { id: '2', kode: 'BRG002', nama: 'Pulpen Standard', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 18, minStok: 25, harga: 3500, createdAt: '2024-01-10' },
  { id: '3', kode: 'BRG003', nama: 'Buku Tulis Sidu', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 45, minStok: 30, harga: 5000, createdAt: '2024-01-12' },
  { id: '4', kode: 'BRG004', nama: 'Stapler Kenko', satuan: 'Pcs', kategori: 'Peralatan Kantor', stok: 8, minStok: 5, harga: 25000, createdAt: '2024-01-15' },
  { id: '5', kode: 'BRG005', nama: 'Tinta Printer Canon 745', satuan: 'Pcs', kategori: 'Peralatan Kantor', stok: 5, minStok: 10, harga: 75000, createdAt: '2024-01-15' },
  { id: '6', kode: 'BRG006', nama: 'Amplop Coklat', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 60, minStok: 40, harga: 1500, createdAt: '2024-01-18' },
  { id: '7', kode: 'BRG007', nama: 'Penggaris 30cm', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 15, minStok: 10, harga: 8000, createdAt: '2024-01-20' },
  { id: '8', kode: 'BRG008', nama: 'Map Ordner', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 8, minStok: 15, harga: 18000, createdAt: '2024-01-22' },
  { id: '9', kode: 'BRG009', nama: 'Spidol Whiteboard', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 20, minStok: 12, harga: 12000, createdAt: '2024-02-01' },
  { id: '10', kode: 'BRG010', nama: 'Kertas F4 70gr', satuan: 'Rim', kategori: 'Alat Tulis', stok: 30, minStok: 20, harga: 50000, createdAt: '2024-02-05' },
  { id: '11', kode: 'BRG011', nama: 'Tipe-X Snowman', satuan: 'Pcs', kategori: 'Alat Tulis', stok: 25, minStok: 15, harga: 6000, createdAt: '2024-02-08' },
  { id: '12', kode: 'BRG012', nama: 'Flashdisk 16GB', satuan: 'Pcs', kategori: 'Elektronik', stok: 7, minStok: 10, harga: 80000, createdAt: '2024-02-10' },
  { id: '13', kode: 'BRG013', nama: 'Mouse USB Logitech', satuan: 'Pcs', kategori: 'Elektronik', stok: 10, minStok: 5, harga: 120000, createdAt: '2024-02-12' },
  { id: '14', kode: 'BRG014', nama: 'Keyboard USB', satuan: 'Pcs', kategori: 'Elektronik', stok: 6, minStok: 5, harga: 150000, createdAt: '2024-02-15' },
  { id: '15', kode: 'BRG015', nama: 'Flashdisk 32GB', satuan: 'Pcs', kategori: 'Elektronik', stok: 4, minStok: 8, harga: 120000, createdAt: '2024-02-18' },
];

export const mockTransaksi: Transaksi[] = [
  { id: '1', noTransaksi: 'BM-2024-0058', tanggal: '2024-05-24 10:15', jenis: 'masuk', barangId: '1', kodeBarang: 'BRG001', namaBarang: 'Kertas HVS A4 70gr', jumlah: 10, stokSebelum: 20, stokSesudah: 30, petugas: 'Petugas 1' },
  { id: '2', noTransaksi: 'BK-2024-0047', tanggal: '2024-05-24 09:47', jenis: 'keluar', barangId: '2', kodeBarang: 'BRG012', namaBarang: 'Pulpen Standard', jumlah: 5, stokSebelum: 25, stokSesudah: 20, petugas: 'Petugas 2' },
  { id: '3', noTransaksi: 'BM-2024-0056', tanggal: '2024-05-23 16:30', jenis: 'masuk', barangId: '5', kodeBarang: 'BRG005', namaBarang: 'Tinta Printer Canon 745', jumlah: 8, stokSebelum: 42, stokSesudah: 50, petugas: 'Petugas 1' },
  { id: '4', noTransaksi: 'BK-2024-0055', tanggal: '2024-05-23 14:22', jenis: 'keluar', barangId: '8', kodeBarang: 'BRG008', namaBarang: 'Map Ordner', jumlah: 3, stokSebelum: 42, stokSesudah: 39, petugas: 'Petugas 2' },
  { id: '5', noTransaksi: 'BM-2024-0054', tanggal: '2024-05-22 11:05', jenis: 'masuk', barangId: '2', kodeBarang: 'BRG012', namaBarang: 'Pulpen Standard', jumlah: 20, stokSebelum: 5, stokSesudah: 25, petugas: 'Petugas 1' },
  { id: '6', noTransaksi: 'BK-2024-0053', tanggal: '2024-05-22 09:30', jenis: 'keluar', barangId: '1', kodeBarang: 'BRG001', namaBarang: 'Kertas HVS A4 70gr', jumlah: 5, stokSebelum: 35, stokSesudah: 30, petugas: 'Admin' },
  { id: '7', noTransaksi: 'BM-2024-0052', tanggal: '2024-05-21 14:00', jenis: 'masuk', barangId: '15', kodeBarang: 'BRG015', namaBarang: 'Flashdisk 32GB', jumlah: 5, stokSebelum: 0, stokSesudah: 5, petugas: 'Petugas 1' },
  { id: '8', noTransaksi: 'BK-2024-0051', tanggal: '2024-05-21 10:15', jenis: 'keluar', barangId: '9', kodeBarang: 'BRG009', namaBarang: 'Spidol Whiteboard', jumlah: 4, stokSebelum: 24, stokSesudah: 20, petugas: 'Petugas 2' },
  { id: '9', noTransaksi: 'BM-2024-0050', tanggal: '2024-05-20 16:45', jenis: 'masuk', barangId: '10', kodeBarang: 'BRG010', namaBarang: 'Kertas F4 70gr', jumlah: 15, stokSebelum: 15, stokSesudah: 30, petugas: 'Admin' },
  { id: '10', noTransaksi: 'BK-2024-0049', tanggal: '2024-05-20 08:30', jenis: 'keluar', barangId: '5', kodeBarang: 'BRG005', namaBarang: 'Tinta Printer Canon 745', jumlah: 2, stokSebelum: 7, stokSesudah: 5, petugas: 'Petugas 1' },
];

export const mockUsers: UserData[] = [
  { id: '1', username: 'admin', name: 'Administrator', role: 'admin', email: 'admin@gudang.com', status: 'aktif', createdAt: '2024-01-01' },
  { id: '2', username: 'petugas1', name: 'Budi Santoso', role: 'petugas', email: 'budi@gudang.com', status: 'aktif', createdAt: '2024-01-05' },
  { id: '3', username: 'petugas2', name: 'Siti Rahayu', role: 'petugas', email: 'siti@gudang.com', status: 'aktif', createdAt: '2024-01-10' },
  { id: '4', username: 'petugas3', name: 'Andi Wijaya', role: 'petugas', email: 'andi@gudang.com', status: 'nonaktif', createdAt: '2024-02-01' },
];

export const chartData = [
  { tanggal: '18 Mei', masuk: 25, keluar: 15 },
  { tanggal: '19 Mei', masuk: 45, keluar: 30 },
  { tanggal: '20 Mei', masuk: 60, keluar: 42 },
  { tanggal: '21 Mei', masuk: 35, keluar: 55 },
  { tanggal: '22 Mei', masuk: 80, keluar: 48 },
  { tanggal: '23 Mei', masuk: 55, keluar: 62 },
  { tanggal: '24 Mei', masuk: 95, keluar: 70 },
];
