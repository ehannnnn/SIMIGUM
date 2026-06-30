export type Role = 'ADMIN' | 'PETUGAS_GUDANG' | 'admin' | 'petugas';

export interface User {
  id: string | number;
  username: string;
  name: string;
  role: Role | string;
  avatar?: string;
  token?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    token: string,
    username: string,
    name: string,
    role: string
  ) => boolean;
  logout: () => void;
}

export interface MasterData {
  id: number;
  nama: string;
}

export interface Barang {
  id: number;
  kodeBarang: string;
  namaBarang: string;
  kategori: MasterData;
  supplier: MasterData;
  satuan: string;
  stokSaatIni: number;
  minimumStok: number;
  harga?: number;
  deskripsi?: string;
  createdAt?: string;
  updatedAt?: string;
  statusStok?: string;
}

export interface Transaksi {
  id: string | number;
  noTransaksi?: string;
  tanggal: string;
  jenis?: 'masuk' | 'keluar';
  jenisTransaksi?: 'MASUK' | 'KELUAR';
  barangId?: string | number;
  barang?: Barang;
  kodeBarang?: string;
  namaBarang?: string;
  jumlah: number;
  stokSebelum: number;
  stokSesudah: number;
  keterangan?: string;
  petugas?: string;
  user?: User;
}

export interface UserData {
  id: string | number;
  username: string;
  name: string;
  role: Role | string;
  email: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}