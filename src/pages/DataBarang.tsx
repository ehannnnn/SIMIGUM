import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Tags,
  ScanLine,
  Camera,
  Loader2,
  Truck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';

type MasterOption = {
  id: number;
  nama: string;
};

type BarangItem = {
  id: number;
  kodeBarang: string;
  namaBarang: string;
  kategori?: MasterOption | string | null;
  supplier?: MasterOption | string | null;
  satuan?: string;
  stokSaatIni: number;
  minimumStok: number;
  harga?: number;
  deskripsi?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BarangFormData = {
  kodeBarang: string;
  namaBarang: string;
  kategoriId: string;
  supplierId: string;
  satuan: string;
  stokSaatIni: string | number;
  minimumStok: string | number;
  harga: string | number;
  deskripsi: string;
};

const API_URL = 'http://localhost:8080/api';

const getRelasiNama = (value: BarangItem['kategori'] | BarangItem['supplier']): string => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.nama || '-';
};

export default function DataBarang() {
  const { user } = useAuth();
  const isAdmin = String(user?.role).toUpperCase() === 'ADMIN';

  const getToken = () => {
    let token = localStorage.getItem('token');

    if (!token) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        token = storedUser.token || storedUser.accessToken || storedUser.jwt;
      } catch (e) {
        // ignore invalid localStorage JSON
      }
    }

    if (!token) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('inventaris_user') || '{}');
        token = storedUser.token || storedUser.accessToken || storedUser.jwt;
      } catch (e) {
        // ignore invalid localStorage JSON
      }
    }

    if (!token && user && (user as any).token) {
      token = (user as any).token;
    }

    return token;
  };

  const getHeaders = (withJson = true) => {
    const token = getToken();
    return {
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [kategoriList, setKategoriList] = useState<MasterOption[]>([]);
  const [supplierList, setSupplierList] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BarangItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showKategoriModal, setShowKategoriModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDataBarang(), fetchKategori(), fetchSupplier()]);
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchKategori = async () => {
    try {
      const response = await fetch(`${API_URL}/kategori`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Gagal mengambil data kategori');

      const data = await response.json();
      setKategoriList(
        data.map((k: any) => ({
          id: Number(k.id),
          nama: k.nama || k.namaKategori || '-'
        }))
      );
    } catch (err) {
      console.error('Gagal mengambil data kategori', err);
    }
  };

  const fetchSupplier = async () => {
    try {
      const response = await fetch(`${API_URL}/supplier`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Gagal mengambil data supplier');

      const data = await response.json();
      setSupplierList(
        data.map((s: any) => ({
          id: Number(s.id),
          nama: s.nama || s.namaSupplier || '-'
        }))
      );
    } catch (err) {
      console.error('Gagal mengambil data supplier', err);
    }
  };

  const fetchDataBarang = async () => {
    try {
      setErrorMsg('');
      const token = getToken();
      if (!token) throw new Error('Token tidak ditemukan, silakan login ulang.');

      const response = await fetch(`${API_URL}/barang`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Gagal mengambil data barang dari server');

      const data = await response.json();
      setBarangList(
        data.map((item: any) => ({
          id: Number(item.id),
          kodeBarang: item.kodeBarang || item.kode || '',
          namaBarang: item.namaBarang || item.nama || '',
          kategori: item.kategori || null,
          supplier: item.supplier || null,
          satuan: item.satuan || '',
          stokSaatIni: Number(item.stokSaatIni ?? item.stok ?? 0),
          minimumStok: Number(item.minimumStok ?? item.minStok ?? 0),
          harga: Number(item.harga ?? 0),
          deskripsi: item.deskripsi || ''
        }))
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/barang/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      });

      if (!response.ok) throw new Error('Gagal menghapus data barang');

      setBarangList(prev => prev.filter(b => b.id !== id));
      setDeleteId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveKategori = async (newCat: string): Promise<MasterOption | null> => {
    try {
      const nama = newCat.trim();
      if (!nama) return null;

      const existing = kategoriList.find(k => k.nama.toLowerCase() === nama.toLowerCase());
      if (existing) return existing;

      const response = await fetch(`${API_URL}/kategori`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ nama })
      });

      if (!response.ok) throw new Error('Gagal menyimpan kategori');

      const saved = await response.json();
      const kategori = { id: Number(saved.id), nama: saved.nama || nama };

      setKategoriList(prev => [...prev, kategori]);
      setShowKategoriModal(false);
      return kategori;
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kategori');
      return null;
    }
  };

  const handleSaveSupplier = async (newSup: string): Promise<MasterOption | null> => {
    try {
      const nama = newSup.trim();
      if (!nama) return null;

      const existing = supplierList.find(s => s.nama.toLowerCase() === nama.toLowerCase());
      if (existing) return existing;

      const response = await fetch(`${API_URL}/supplier`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ nama })
      });

      if (!response.ok) throw new Error('Gagal menyimpan supplier');

      const saved = await response.json();
      const supplier = { id: Number(saved.id), nama: saved.nama || nama };

      setSupplierList(prev => [...prev, supplier]);
      setShowSupplierModal(false);
      return supplier;
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan supplier');
      return null;
    }
  };

  const handleSaveBarang = async (formData: BarangFormData) => {
    try {
      const token = getToken();
      if (!token) throw new Error('Token tidak valid');

      const kategoriId = Number(formData.kategoriId);
      const supplierId = Number(formData.supplierId);

      if (!kategoriId) throw new Error('Kategori wajib dipilih');
      if (!supplierId) throw new Error('Supplier wajib dipilih');

      const finalKode = formData.kodeBarang || `BRG${String(barangList.length + 1).padStart(3, '0')}`;

      const payload = {
        kodeBarang: finalKode,
        namaBarang: formData.namaBarang,
        kategori: { id: kategoriId },
        supplier: { id: supplierId },
        satuan: formData.satuan,
        stokSaatIni: Number(formData.stokSaatIni) || 0,
        minimumStok: Number(formData.minimumStok) || 0,
        harga: Number(formData.harga) || 0,
        deskripsi: formData.deskripsi || 'Tidak ada deskripsi'
      };

      if (editItem) {
        const response = await fetch(`${API_URL}/barang/${editItem.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Gagal mengupdate barang');

        const updatedItem = await response.json();
        setBarangList(prev =>
          prev.map(b =>
            b.id === editItem.id
              ? {
                  id: Number(updatedItem.id),
                  kodeBarang: updatedItem.kodeBarang,
                  namaBarang: updatedItem.namaBarang,
                  kategori: updatedItem.kategori,
                  supplier: updatedItem.supplier,
                  satuan: updatedItem.satuan,
                  stokSaatIni: Number(updatedItem.stokSaatIni ?? 0),
                  minimumStok: Number(updatedItem.minimumStok ?? 0),
                  harga: Number(updatedItem.harga ?? 0),
                  deskripsi: updatedItem.deskripsi || ''
                }
              : b
          )
        );
      } else {
        const response = await fetch(`${API_URL}/barang`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Gagal menambahkan barang baru');
        }

        const newItem = await response.json();
        setBarangList(prev => [
          {
            id: Number(newItem.id),
            kodeBarang: newItem.kodeBarang,
            namaBarang: newItem.namaBarang,
            kategori: newItem.kategori,
            supplier: newItem.supplier,
            satuan: newItem.satuan,
            stokSaatIni: Number(newItem.stokSaatIni ?? 0),
            minimumStok: Number(newItem.minimumStok ?? 0),
            harga: Number(newItem.harga ?? 0),
            deskripsi: newItem.deskripsi || ''
          },
          ...prev
        ]);
      }

      setShowModal(false);
      setEditItem(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan barang');
    }
  };

  const allCategories = kategoriList.map(k => k.nama).sort();
  const filtered = barangList.filter(b => {
    const q = search.toLowerCase();
    const kategoriNama = getRelasiNama(b.kategori);

    return (
      (b.namaBarang.toLowerCase().includes(q) || b.kodeBarang.toLowerCase().includes(q)) &&
      (!filterKategori || kategoriNama === filterKategori)
    );
  });

  const totalPage = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const inputCls =
    'w-full px-2.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="text-center text-red-500 py-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-semibold text-sm">{errorMsg}</p>
        <button onClick={fetchDataBarang} className="mt-2 text-xs text-green-700 underline">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-xs flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari atau scan kode..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} pl-8`}
              />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 transition-colors"
              title="Scan Barcode Barang"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>

          <div className="relative w-full sm:w-auto sm:min-w-[150px]">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterKategori}
              onChange={e => {
                setFilterKategori(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} pl-8 pr-6 appearance-none cursor-pointer`}
            >
              <option value="">Semua Kategori</option>
              {allCategories.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1.5 w-full lg:w-auto justify-end flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowKategoriModal(true)}
              className="relative z-10 flex items-center gap-1.5 bg-[#0f4d2f] hover:bg-[#1f6744] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow"
            >
              <Tags className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Kategori</span>
            </button>
            <button
              onClick={() => setShowSupplierModal(true)}
              className="relative z-10 flex items-center gap-1.5 bg-[#0f4d2f] hover:bg-[#1f6744] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow"
            >
              <Truck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Supplier</span>
            </button>
            <button
              onClick={() => {
                setEditItem(null);
                setShowModal(true);
              }}
              className="relative z-10 flex items-center gap-1.5 bg-[#0f4d2f] hover:bg-[#1f6744] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Barang
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {[
          {
            label: 'Total Barang',
            val: barangList.length,
            color: 'text-green-800 dark:text-green-400'
          },
          {
            label: 'Stok Normal',
            val: barangList.filter(b => b.stokSaatIni > b.minimumStok).length,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'Stok Menipis/Habis',
            val: barangList.filter(b => b.stokSaatIni <= b.minimumStok).length,
            color: 'text-red-500 dark:text-red-400'
          }
        ].map(s => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-900 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800 shadow-sm text-center transition-colors"
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Kode', 'Nama Barang', 'Kategori', 'Supplier', 'Satuan', 'Stok', 'Min. Stok', 'Harga', 'Status', ...(isAdmin ? ['Aksi'] : [])].map(h => (
                  <th
                    key={h}
                    className={`py-2 px-2.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === 'Aksi' ? 'text-center' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {paged.length > 0 ? (
                paged.map(b => {
                  const isHabis = b.stokSaatIni === 0;
                  const isMenipis = !isHabis && b.stokSaatIni <= b.minimumStok;
                  const kategoriNama = getRelasiNama(b.kategori);
                  const supplierNama = getRelasiNama(b.supplier);

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="py-1.5 px-2.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                        {b.kodeBarang}
                      </td>

                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center justify-center flex-shrink-0 border border-green-100 dark:border-green-800/30">
                            <Package className="w-3 h-3 text-green-700 dark:text-green-400" />
                          </div>
                          <span className="font-semibold text-xs text-gray-900 dark:text-white truncate max-w-[150px]">
                            {b.namaBarang}
                          </span>
                        </div>
                      </td>

                      <td className="py-1.5 px-2.5">
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-[9px] px-1.5 py-0.5 rounded font-medium">
                          {kategoriNama}
                        </span>
                      </td>

                      <td className="py-1.5 px-2.5 text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate max-w-[120px]" title={supplierNama}>
                        {supplierNama}
                      </td>

                      <td className="py-1.5 px-2.5 text-gray-600 dark:text-gray-400 font-medium text-[11px]">
                        {b.satuan || '-'}
                      </td>

                      <td className="py-1.5 px-2.5">
                        <span className={`font-bold text-xs ${isHabis ? 'text-red-600 dark:text-red-400' : isMenipis ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                          {b.stokSaatIni}
                        </span>
                      </td>

                      <td className="py-1.5 px-2.5 text-gray-500 dark:text-gray-500 font-medium text-[11px]">
                        {b.minimumStok}
                      </td>

                      <td className="py-1.5 px-2.5 text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                        Rp {b.harga?.toLocaleString('id-ID') || 0}
                      </td>

                      <td className="py-1.5 px-2.5">
                        {isHabis ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-red-100 dark:border-red-900/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Habis
                          </span>
                        ) : isMenipis ? (
                          <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-yellow-100 dark:border-yellow-900/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-green-100 dark:border-green-900/30">
                            Normal
                          </span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-1.5 px-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditItem(b);
                                setShowModal(true);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="Edit Data"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteId(b.id)}
                              className="w-6 h-6 flex items-center justify-center rounded text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="py-6 text-center text-[11px] text-gray-500 dark:text-gray-400">
                    Tidak ada data barang yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 gap-2">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            Menampilkan <span className="font-bold text-gray-900 dark:text-white">{filtered.length > 0 ? Math.min((page - 1) * perPage + 1, filtered.length) : 0}</span> –{' '}
            <span className="font-bold text-gray-900 dark:text-white">{Math.min(page * perPage, filtered.length)}</span> dari{' '}
            <span className="font-bold text-gray-900 dark:text-white">{filtered.length}</span> data
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
            {Array.from({ length: Math.min(totalPage, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${page === p ? 'bg-green-800 text-white shadow-sm' : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPage, p + 1))}
              disabled={page === totalPage || totalPage === 0}
              className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={kode => {
            setSearch(kode);
            setPage(1);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showModal && (
        <BarangModal
          item={editItem}
          categories={kategoriList}
          suppliers={supplierList}
          isAdmin={isAdmin}
          onClose={() => setShowModal(false)}
          onSave={handleSaveBarang}
        />
      )}

      {showKategoriModal && isAdmin && <KategoriModal onClose={() => setShowKategoriModal(false)} onSave={handleSaveKategori} />}
      {showSupplierModal && isAdmin && <SupplierModal onClose={() => setShowSupplierModal(false)} onSave={handleSaveSupplier} />}

      {deleteId &&
        isAdmin &&
        createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }} className="flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white text-center mb-1.5">Hapus Barang?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">Tindakan ini tidak dapat dibatalkan. Data akan dihapus dari sistem.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function BarangModal({
  item,
  categories,
  suppliers,
  isAdmin,
  onClose,
  onSave
}: {
  item: BarangItem | null;
  categories: MasterOption[];
  suppliers: MasterOption[];
  isAdmin: boolean;
  onClose: () => void;
  onSave: (data: BarangFormData) => Promise<void> | void;
}) {
  const [form, setForm] = useState<BarangFormData>({
    kodeBarang: item?.kodeBarang || '',
    namaBarang: item?.namaBarang || '',
    kategoriId: typeof item?.kategori === 'object' && item.kategori ? String(item.kategori.id) : '',
    supplierId: typeof item?.supplier === 'object' && item.supplier ? String(item.supplier.id) : '',
    satuan: item?.satuan || '',
    stokSaatIni: item?.stokSaatIni ?? '',
    minimumStok: item?.minimumStok ?? '',
    harga: item?.harga ?? '',
    deskripsi: item?.deskripsi || ''
  });

  const [scanMode, setScanMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50 focus:bg-white dark:bg-gray-800/50 dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all';
  const labelCls = 'block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide';

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }} className="flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Package className="w-4 h-4 text-green-700" />
              {item ? 'Edit Data Barang' : 'Tambah Barang'}
            </h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-1">
              <label className={labelCls}>Kode Barcode</label>
              <div className="flex gap-1.5">
                <input
                  value={form.kodeBarang}
                  onChange={e => setForm({ ...form, kodeBarang: e.target.value })}
                  className={inputCls}
                  placeholder="Scan atau ketik kode"
                />
                <button
                  onClick={() => setScanMode(true)}
                  className="px-3 bg-[#0f4d2f] text-green-300 hover:bg-[#1f6744] dark:bg-green-900/30 dark:text-green-400 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors border border-green-200 dark:border-green-800/50"
                  title="Scan dari Kamera"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Nama Barang</label>
              <input
                value={form.namaBarang}
                onChange={e => setForm({ ...form, namaBarang: e.target.value })}
                className={inputCls}
                placeholder="Contoh: Qtela Singkong 100gr"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Kategori</label>
                <div className="relative">
                  <select
                    value={form.kategoriId}
                    onChange={e => setForm({ ...form, kategoriId: e.target.value })}
                    className={`${inputCls} appearance-none cursor-pointer pr-8`}
                  >
                    <option value="" disabled>
                      Pilih Kategori
                    </option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Satuan</label>
                <input
                  value={form.satuan}
                  onChange={e => setForm({ ...form, satuan: e.target.value })}
                  className={inputCls}
                  placeholder="Pcs, Dus..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Stok Awal</label>
                <input
                  type="number"
                  value={form.stokSaatIni}
                  onChange={e => setForm({ ...form, stokSaatIni: e.target.value })}
                  className={inputCls}
                  min={0}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Batas Minimum</label>
                <input
                  type="number"
                  value={form.minimumStok}
                  onChange={e => setForm({ ...form, minimumStok: e.target.value })}
                  className={inputCls}
                  min={0}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Supplier {!isAdmin && <span className="text-red-500 lowercase">(Terkunci)</span>}</label>
                <div className="relative">
                  <select
                    value={form.supplierId}
                    onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className={`${inputCls} appearance-none cursor-pointer pr-8`}
                  >
                    <option value="" disabled>
                      Pilih Supplier
                    </option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Harga Satuan (Rp)</label>
                <input
                  type="number"
                  value={form.harga}
                  onChange={e => setForm({ ...form, harga: e.target.value })}
                  className={inputCls}
                  min={0}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.namaBarang || !form.kategoriId || !form.supplierId || isSaving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {item ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>

      {scanMode && (
        <BarcodeScanner
          onScan={kode => {
            setForm({ ...form, kodeBarang: kode });
            setScanMode(false);
          }}
          onClose={() => setScanMode(false)}
        />
      )}
    </>,
    document.body
  );
}

function KategoriModal({
  onClose,
  onSave
}: {
  onClose: () => void;
  onSave: (cat: string) => Promise<MasterOption | null> | MasterOption | null | void;
}) {
  const [newKategori, setNewKategori] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave(newKategori.trim());
    setIsSaving(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }} className="flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-5 text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <Tags className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Kategori Baru</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tambahkan kategori barang baru.</p>
          </div>
          <input
            type="text"
            autoFocus
            value={newKategori}
            onChange={e => setNewKategori(e.target.value)}
            className="w-full px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50 focus:bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white transition-all font-medium"
            placeholder="Contoh: Elektronik"
          />
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newKategori.trim() || isSaving}
            className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-slate-200 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SupplierModal({
  onClose,
  onSave
}: {
  onClose: () => void;
  onSave: (sup: string) => Promise<MasterOption | null> | MasterOption | null | void;
}) {
  const [newSupplier, setNewSupplier] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave(newSupplier.trim());
    setIsSaving(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }} className="flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-5 text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <Truck className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Supplier Baru</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tambahkan data supplier baru.</p>
          </div>
          <input
            type="text"
            autoFocus
            value={newSupplier}
            onChange={e => setNewSupplier(e.target.value)}
            className="w-full px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50 focus:bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white transition-all font-medium"
            placeholder="Contoh: PT Sumber Rejeki"
          />
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newSupplier.trim() || isSaving}
            className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-slate-200 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
