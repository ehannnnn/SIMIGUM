import { useState, useEffect } from 'react';
import { Search, Filter, Download, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Calendar, ClipboardList, Eye, MoreVertical } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaksi } from '../types';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
const BASE_URL = API_URL;
const getHeaders = () => {
  let token = null;
  try {
    const userStr = localStorage.getItem('inventaris_user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      token = userData.token || userData.accessToken || userData.jwt;
    }
  } catch (error) {}
  return {
    'Content-Type': 'application/json',
    ...(token ? {
      'Authorization': `Bearer ${token}`
    } : {})
  };
};
const riwayatService = {
  fetchRiwayat: async (isAdmin: boolean, username: string): Promise<any[]> => {
    let url = `${BASE_URL}/transaksi`;
    if (!isAdmin && username) {
      url += `?userId=${username}`;
    }
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Gagal mengambil data riwayat");
    return res.json();
  }
};
export default function RiwayatTransaksi() {
  const {
    user
  } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTransaksi, setSelectedTransaksi] = useState<any | null>(null);
  const handleFetchData = async () => {
    try {
      setLoading(true);
      let currentUsername = user?.username || user?.name || '';
      const userStr = localStorage.getItem('inventaris_user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        currentUsername = parsed.username || parsed.name || currentUsername;
      }
      const rawData = await riwayatService.fetchRiwayat(isAdmin, currentUsername);
      const mappedData = rawData.map((t: any) => {
        const dateObj = t.tanggal ? new Date(t.tanggal) : new Date();
        return {
          id: String(t.id),
          noTransaksi: t.noTransaksi || `${String(t.jenisTransaksi).toUpperCase() === 'MASUK' ? 'BM' : 'BK'}-${String(t.id).padStart(4, '0')}`,
          tanggal: dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          }),
          rawDate: dateObj.toISOString().split('T')[0],
          jenis: String(t.jenisTransaksi).toLowerCase(),
          kodeBarang: t.barang?.kodeBarang || t.barang?.kode || '-',
          namaBarang: t.barang?.namaBarang || t.barang?.nama || '-',
          jumlah: t.jumlah,
          satuan: t.barang?.satuan || 'Pcs',
          petugas: t.user?.name || t.user?.username || 'System',
          keterangan: t.keterangan || '-'
        };
      });
      setTransaksiList(mappedData.sort((a, b) => Number(b.id) - Number(a.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    handleFetchData();
  }, [isAdmin, user]);
  const filtered = transaksiList.filter(t => {
    const matchesJenis = filterJenis === 'semua' || t.jenis === filterJenis;
    const matchesDate = (!startDate || t.rawDate >= startDate) && (!endDate || t.rawDate <= endDate);
    const q = search.toLowerCase();
    const matchesSearch = t.namaBarang.toLowerCase().includes(q) || t.noTransaksi.toLowerCase().includes(q) || t.kodeBarang.toLowerCase().includes(q) || t.petugas.toLowerCase().includes(q);
    return matchesJenis && matchesDate && matchesSearch;
  });
  const totalPage = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const statTotalTransaksi = filtered.length;
  const statBarangMasuk = filtered.filter(t => t.jenis === 'masuk').length;
  const statBarangKeluar = filtered.filter(t => t.jenis === 'keluar').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const statHariIni = filtered.filter(t => t.rawDate === todayStr).length;
  const handleExportPDF = () => {
    if (!isAdmin) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('LAPORAN RIWAYAT TRANSAKSI BARANG (GLOBAL)', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}`, 14, 25);
    doc.text(`Operator Pencetak: ${user?.name || 'Administrator'} | Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 30);
    const tableColumn = ["No", "Tanggal Transaksi", "No. Transaksi", "Jenis", "Kode", "Nama Barang", "Jumlah", "Petugas", "Keterangan"];
    const tableRows: any[] = [];
    filtered.forEach((t, index) => {
      const rowData = [index + 1, t.tanggal, t.noTransaksi, t.jenis.toUpperCase(), t.kodeBarang, t.namaBarang, `${t.jumlah} ${t.satuan}`, t.petugas, t.keterangan];
      tableRows.push(rowData);
    });
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 36,
      theme: 'striped',
      headStyles: {
        fillColor: [16, 185, 129]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });
    doc.save(`Riwayat_Transaksi_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  if (loading) {
    return <div className="p-10 text-center text-gray-500">Memuat data riwayat......</div>;
  }
  return <div className="space-y-5 text-gray-900 dark:text-white">
      
      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">Total Transaksi</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{statTotalTransaksi}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <ArrowDownCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">Barang Masuk</p>
            <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-0.5">{statBarangMasuk}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">Barang Keluar</p>
            <p className="text-2xl font-extrabold text-orange-500 dark:text-orange-400 mt-0.5">{statBarangKeluar}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">Transaksi Hari Ini</p>
            <p className="text-2xl font-extrabold text-red-500 dark:text-red-400 mt-0.5">{statHariIni}</p>
            <p className="text-[10px] text-gray-400 mt-1"><span className="text-red-500 font-bold">Aktual</span> Hari ini</p>
          </div>
        </div>
      </div>

      {}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari Data</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Cari no. transaksi, barang, atau petugas..." value={search} onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }} className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800" />
          </div>
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Jenis Transaksi</label>
          <select value={filterJenis} onChange={e => {
          setFilterJenis(e.target.value as any);
          setPage(1);
        }} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800">
            <option value="semua">Semua</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>

        <div className="w-36">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Dari Tanggal</label>
          <input type="date" value={startDate} onChange={e => {
          setStartDate(e.target.value);
          setPage(1);
        }} className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800" />
        </div>

        <div className="w-36">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={e => {
          setEndDate(e.target.value);
          setPage(1);
        }} className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800" />
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && <button onClick={handleExportPDF} className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>}
        </div>
      </div>

      {}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Daftar Riwayat Transaksi</h3>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
              {isAdmin ? "Mode Admin: Global" : `Mode Shift: ${user?.name}`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Tanggal', 'No. Transaksi', 'Jenis', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Petugas', 'Keterangan'].map(h => <th key={h} className="text-left py-3.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                {isAdmin && <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {paged.map(t => <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.tanggal}</td>
                  <td className="py-3 px-4 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">{t.noTransaksi}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${t.jenis === 'masuk' ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30' : 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30'}`}>
                      {t.jenis === 'masuk' ? '↓ Masuk' : '↑ Keluar'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-gray-400 dark:text-gray-500">{t.kodeBarang}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{t.namaBarang}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold text-base ${t.jenis === 'masuk' ? 'text-green-600' : 'text-orange-600'}`}>
                      {t.jumlah}
                    </span>
                    <span className="text-gray-400 text-xs ml-1 font-normal">{t.satuan}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">{t.petugas}</td>
                  <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{t.keterangan}</td>
                  
                  {isAdmin && <td className="py-3 px-4 relative">
                      <button onClick={() => setActiveMenuId(activeMenuId === t.id ? null : t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeMenuId === t.id && <div className="absolute right-4 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1 text-xs">
                          <button onClick={() => {
                    setSelectedTransaksi(t);
                    setActiveMenuId(null);
                  }} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Eye className="w-3.5 h-3.5 text-green-600" /> Detail Info
                          </button>
                        </div>}
                    </td>}
                </tr>)}
              {paged.length === 0 && <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-gray-500">Tidak ada data transaksi yang ditemukan.</td>
                </tr>}
            </tbody>
          </table>
        </div>

        {}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Menampilkan {filtered.length === 0 ? 0 : Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} dari {filtered.length} data
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {Array.from({
            length: totalPage
          }, (_, i) => i + 1).map(p => <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium ${page === p ? 'bg-green-700 text-white' : 'border border-gray-200 dark:border-gray-700'}`}>{p}</button>)}
            <button onClick={() => setPage(p => Math.min(totalPage, p + 1))} disabled={page === totalPage || totalPage === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {}
      {selectedTransaksi && <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 max-w-sm w-full border border-gray-100 dark:border-gray-800 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm border-b pb-2">Detail Riwayat Audit System</h4>
            <div className="space-y-2.5 text-xs">
              <p><span className="text-gray-400">No. Audit:</span> <span className="font-mono font-semibold">{selectedTransaksi.noTransaksi}</span></p>
              <p><span className="text-gray-400">Waktu Log:</span> {selectedTransaksi.tanggal}</p>
              <p><span className="text-gray-400">Jenis Gerakan:</span> <span className={`capitalize font-bold ${selectedTransaksi.jenis === 'masuk' ? 'text-green-600' : 'text-orange-600'}`}>{selectedTransaksi.jenis}</span></p>
              <p><span className="text-gray-400">Spesifikasi Barang:</span> {selectedTransaksi.namaBarang} ({selectedTransaksi.kodeBarang})</p>
              <p><span className="text-gray-400">Volume Transaksi:</span> <span className="font-bold">{selectedTransaksi.jumlah} {selectedTransaksi.satuan}</span></p>
              <p><span className="text-gray-400">Petugas Piket:</span> {selectedTransaksi.petugas}</p>
              <p><span className="text-gray-400">Catatan Keterangan:</span> {selectedTransaksi.keterangan || 'Tidak ada catatan khusus.'}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setSelectedTransaksi(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300">
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>}

    </div>;
}