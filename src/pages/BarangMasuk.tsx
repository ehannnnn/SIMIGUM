import { useState, useEffect } from 'react';
import { ArrowDownCircle, Search, Download, ChevronLeft, ChevronRight, RefreshCw, Save, ClipboardList, TrendingUp, Clock, Lock, Trash2, Edit3, Eye, MoreVertical, CheckCircle, XCircle, ScanLine } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaksi, Barang } from '../types';
import { useAuth } from '../context/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';
import { API_URL } from '../config';
const BASE_URL = API_URL;
const getHeaders = (isPostOrPut = false) => {
  let token = null;
  try {
    const userStr = localStorage.getItem('inventaris_user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      token = userData.token || userData.accessToken || userData.jwt;
    }
  } catch (error) {}
  return {
    ...(isPostOrPut ? {
      'Content-Type': 'application/json'
    } : {}),
    ...(token ? {
      'Authorization': `Bearer ${token}`
    } : {})
  };
};

const getRelasiNama = (value: any): string => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.nama || value.namaSupplier || value.namaKategori || '-';
};

const apiService = {
  fetchBarang: async (): Promise<Barang[]> => {
    const res = await fetch(`${BASE_URL}/barang`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Gagal fetch barang');
    return res.json();
  },
  fetchAll: async (): Promise<Transaksi[]> => {
    const res = await fetch(`${BASE_URL}/transaksi?jenis=MASUK`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Gagal fetch transaksi');
    return res.json();
  },
  fetchByPetugas: async (username: string): Promise<Transaksi[]> => {
    const res = await fetch(`${BASE_URL}/transaksi?jenis=MASUK&userId=${username}`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Gagal fetch transaksi petugas');
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/transaksi`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Gagal simpan transaksi');
    return res.json();
  },
  rollback: async (id: string) => {
    const res = await fetch(`${BASE_URL}/transaksi/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Gagal rollback transaksi');
    return res.json();
  }
};
export default function BarangMasuk() {
  const {
    user
  } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [noTransaksiInput, setNoTransaksiInput] = useState('');
  const [tanggalMasuk, setTanggalMasuk] = useState(new Date().toISOString().split('T')[0]);
  const [barangId, setBarangId] = useState('');
  const [satuanInput, setSatuanInput] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(5);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTransaksi, setSelectedTransaksi] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: ''
  });
  const selectedBarang = barangList.find(b => String(b.id) === String(barangId));
  const autoNoTransaksi = `BM-${new Date().getFullYear()}-${String(transaksiList.length + 1).padStart(4, '0')}`;
  const currentStok = selectedBarang ? selectedBarang.stokSaatIni ?? (selectedBarang as any).stok ?? 0 : 0;
  const stokSetelah = selectedBarang && jumlah ? currentStok + Number(jumlah) : 0;
  useEffect(() => {
    setNoTransaksiInput(autoNoTransaksi);
  }, [transaksiList.length, autoNoTransaksi]);
  useEffect(() => {
    if (selectedBarang) setSatuanInput(selectedBarang.satuan || 'Pcs');else setSatuanInput('');
  }, [barangId, selectedBarang]);
  const loadDataFromDatabase = async () => {
    try {
      const dataBarang = await apiService.fetchBarang();
      setBarangList(dataBarang);
      const userStr = localStorage.getItem('inventaris_user');
      let currentUsername = user?.name || user?.username || '';
      if (userStr) {
        const parsed = JSON.parse(userStr);
        currentUsername = parsed.username || parsed.name || currentUsername;
      }
      let dataTransaksi: Transaksi[] = isAdmin ? await apiService.fetchAll() : await apiService.fetchByPetugas(currentUsername);
      const mappedTransaksi = dataTransaksi.map((t: any) => ({
        id: t.id,
        noTransaksi: t.noTransaksi || `BM-${t.id}`,
        tanggal: new Date(t.tanggal || new Date()).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        jenis: 'masuk',
        barangId: t.barang?.id,
        kodeBarang: t.barang?.kodeBarang || t.barang?.kode || '-',
        namaBarang: t.barang?.namaBarang || t.barang?.nama || '-',
        supplier: getRelasiNama(t.barang?.supplier),
        jumlah: t.jumlah,
        stokSebelum: t.stokSebelum !== null && t.stokSebelum !== undefined ? t.stokSebelum : (t.barang?.stokSaatIni ?? t.barang?.stok ?? 0) - t.jumlah,
        stokSesudah: t.stokSesudah !== null && t.stokSesudah !== undefined ? t.stokSesudah : t.barang?.stokSaatIni ?? t.barang?.stok ?? 0,
        keterangan: t.keterangan || '-',
        petugas: t.user?.name || t.user?.username || 'System'
      }));
      setTransaksiList(mappedTransaksi.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Gagal mengambil data dari database:", error);
    }
  };
  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await loadDataFromDatabase();
      setLoading(false);
    };
    initLoad();
  }, [isAdmin, user]);
  const showPopup = (type: 'success' | 'error', message: string) => {
    setNotification({
      show: true,
      type,
      message
    });
  };
  const handleSave = async () => {
    if (!barangId || !jumlah) return;
    const storedUser = localStorage.getItem('inventaris_user');
    if (!storedUser) return showPopup('error', 'Sesi login habis. Silakan logout dan login kembali.');
    const userData = JSON.parse(storedUser);
    if (!userData.id) return showPopup('error', 'Gagal membaca ID Petugas. Silakan LOGOUT lalu LOGIN kembali!');
    const payloadBackend = {
      barang: {
        id: Number(barangId)
      },
      user: {
        id: Number(userData.id)
      },
      jenisTransaksi: "MASUK",
      jumlah: Number(jumlah),
      keterangan: keterangan || "-"
    };
    try {
      await apiService.create(payloadBackend);
      showPopup('success', 'Transaksi berhasil disimpan dan stok diperbarui!');
      setBarangId('');
      setJumlah('');
      setKeterangan('');
      await loadDataFromDatabase();
      setPage(1);
    } catch (err) {
      showPopup('error', 'Gagal menyimpan ke database. Periksa koneksi backend.');
    }
  };
  const handleRollback = async (id: string) => {
    if (!isAdmin) return showPopup('error', 'Akses Ditolak! Hanya Admin yang bisa melakukan rollback.');
    if (confirm("Apakah Anda yakin ingin melakukan rollback? Tindakan ini akan menghapus transaksi dari database dan mengembalikan stok.")) {
      try {
        await apiService.rollback(id);
        showPopup('success', 'Transaksi berhasil dihapus (rollback) dari database.');
        setActiveMenuId(null);
        await loadDataFromDatabase();
      } catch (err) {
        showPopup('error', 'Gagal melakukan rollback pada database.');
      }
    }
  };
  const filtered = transaksiList.filter(t => {
    const q = search.toLowerCase();
    return t.namaBarang.toLowerCase().includes(q) || t.noTransaksi.toLowerCase().includes(q) || t.kodeBarang.toLowerCase().includes(q) || t.supplier.toLowerCase().includes(q);
  });
  const totalPage = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const lastTr = transaksiList[0];
  const totalItem = transaksiList.reduce((s, t) => s + Number(t.jumlah), 0);
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const now = new Date();
    const printDate = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const printTime = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const GREEN = [21, 128, 61] as [number, number, number];
    const GREEN_LIGHT = [220, 252, 231] as [number, number, number];
    const GRAY_DARK = [30, 30, 30] as [number, number, number];
    const GRAY_MID = [100, 100, 100] as [number, number, number];
    const GRAY_LIGHT = [245, 245, 245] as [number, number, number];
    const WHITE = [255, 255, 255] as [number, number, number];
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text('LAPORAN BARANG MASUK', 14, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${printDate}, ${printTime}`, pageW - 14, 10, {
      align: 'right'
    });
    doc.text(`Oleh: ${user?.name || 'Admin'}`, pageW - 14, 16, {
      align: 'right'
    });
    doc.setFillColor(...GREEN_LIGHT);
    doc.rect(0, 22, pageW, 14, 'F');
    const totalJumlah = filtered.reduce((s, t) => s + Number(t.jumlah), 0);
    const infoItems = [{
      label: 'Total Transaksi',
      value: String(filtered.length)
    }, {
      label: 'Total Item Masuk',
      value: String(totalJumlah)
    }, {
      label: 'Periode Data',
      value: filtered.length > 0 ? `${filtered[filtered.length - 1].tanggal} – ${filtered[0].tanggal}` : '—'
    }, {
      label: 'Filter Aktif',
      value: search ? `"${search}"` : 'Semua Data'
    }];
    const colW = pageW / infoItems.length;
    infoItems.forEach((item, i) => {
      const x = i * colW + 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...GREEN);
      doc.text(item.value, x, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_MID);
      doc.text(item.label, x, 34);
    });
    const tableColumn = ['No', 'Tanggal', 'No. Transaksi', 'Kode Barang', 'Nama Barang', 'Supplier', 'Masuk', 'Awal', 'Akhir', 'Petugas'];
    const tableRows: (string | number)[][] = filtered.map((t, i) => {
      const satuan = barangList.find(b => String(b.id) === String(t.barangId))?.satuan || 'Pcs';
      return [i + 1, t.tanggal, t.noTransaksi, t.kodeBarang, t.namaBarang, t.supplier, `${t.jumlah} ${satuan}`, t.stokSebelum, t.stokSesudah, t.petugas];
    });
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: {
          top: 3,
          bottom: 3,
          left: 4,
          right: 4
        },
        textColor: GRAY_DARK,
        lineColor: [220, 220, 220],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: GREEN,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: GRAY_LIGHT
      },
      columnStyles: {
        0: {
          halign: 'center',
          cellWidth: 8
        },
        1: {
          cellWidth: 25
        },
        2: {
          cellWidth: 26,
          font: 'courier'
        },
        3: {
          cellWidth: 22,
          font: 'courier'
        },
        4: {
          cellWidth: 38,
          fontStyle: 'bold'
        },
        5: {
          cellWidth: 35
        },
        6: {
          halign: 'center',
          cellWidth: 20
        },
        7: {
          halign: 'center',
          cellWidth: 15
        },
        8: {
          halign: 'center',
          cellWidth: 15
        },
        9: {
          cellWidth: 25
        }
      },
      didParseCell: data => {
        if (data.section === 'body' && (data.column.index === 6 || data.column.index === 8)) {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: {
        left: 10,
        right: 10
      }
    });
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.5);
      doc.line(10, pageH - 12, pageW - 10, pageH - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_MID);
      doc.text('Sistem Manajemen Gudang — Laporan ini digenerate otomatis oleh sistem.', 10, pageH - 7);
      doc.text(`Halaman ${p} / ${totalPages}`, pageW - 10, pageH - 7, {
        align: 'right'
      });
    }
    doc.save(`Laporan_Barang_Masuk_${now.toISOString().split('T')[0]}.pdf`);
  };
  const inputCls = "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";
  const readonlyCls = "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400";
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5";
  const labelReqCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5";
  if (loading) return <div className="p-10 text-center text-gray-500">Memuat data...</div>;
  return <div className="space-y-6 p-2 relative">
      
      {}
      {notification.show && <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-[999] p-4 transition-all">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center">
              {notification.type === 'success' ? <CheckCircle className="w-14 h-14 text-green-600 animate-bounce" /> : <XCircle className="w-14 h-14 text-red-600 animate-pulse" />}
            </div>
            <div>
              <h4 className={`text-lg font-bold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {notification.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={() => setNotification({
          ...notification,
          show: false
        })} className={`w-full py-2.5 text-sm font-semibold rounded-xl text-white transition-colors shadow-md ${notification.type === 'success' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}>
              Mengerti
            </button>
          </div>
        </div>}

      {}
      {showScanner && <BarcodeScanner onScan={kode => {
      const foundBarang = barangList.find((b: any) => b.kodeBarang === kode || b.kode === kode);
      if (foundBarang) {
        setBarangId(String(foundBarang.id));
        showPopup('success', `Barang terdeteksi: ${foundBarang.namaBarang || foundBarang.namaBarang}`);
      } else {
        showPopup('error', `Barang dengan kode barcode ${kode} tidak ditemukan di database.`);
      }
      setShowScanner(false);
    }} onClose={() => setShowScanner(false)} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">Form Barang Masuk</h3>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                Mode: {user?.role || 'Petugas'}
              </span>
            </div>
            
            {}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>No. Transaksi</label>
                <input value={isAdmin ? noTransaksiInput : autoNoTransaksi} readOnly={!isAdmin} onChange={e => setNoTransaksiInput(e.target.value)} className={isAdmin ? inputCls : readonlyCls} />
              </div>
              <div>
                <label className={labelReqCls}>Tanggal Masuk</label>
                {isAdmin ? <input type="date" value={tanggalMasuk} onChange={e => setTanggalMasuk(e.target.value)} className={inputCls} /> : <input value={new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })} readOnly className={readonlyCls} />}
              </div>
              
              <div className="sm:col-span-2">
                <label className={labelReqCls}>Pilih Barang <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <select value={barangId} onChange={e => setBarangId(e.target.value)} className={`${inputCls} appearance-none flex-1`}>
                    <option value="">Pilih barang...</option>
                    {barangList.map(b => <option key={b.id} value={b.id}>
                        {b.namaBarang || (b as any).nama} ({b.kodeBarang || (b as any).kode || 'N/A'})
                      </option>)}
                  </select>
                  <button onClick={() => setShowScanner(true)} className="bg-green-100 text-green-700 px-4 rounded-xl hover:bg-green-200 transition-colors border border-green-200 flex items-center justify-center shadow-sm" title="Scan Barcode Barang">
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {}
              <div>
                <label className={labelCls}>Kategori</label>
                <input value={getRelasiNama((selectedBarang as any)?.kategori || (selectedBarang as any)?.kategoriBarang).replace('-', '—')} readOnly className={readonlyCls} placeholder="—" />
              </div>
              <div>
                <label className={labelCls}>Supplier Asal</label>
                <div className="relative">
                  <input value={getRelasiNama((selectedBarang as any)?.supplier).replace('-', '—')} readOnly className={readonlyCls} placeholder="—" />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>

              {}
              <div><label className={labelCls}>Satuan</label><input value={satuanInput} readOnly={!isAdmin} onChange={e => setSatuanInput(e.target.value)} className={isAdmin ? inputCls : readonlyCls} placeholder="—" /></div>
              <div><label className={labelCls}>Stok Saat Ini</label><input value={currentStok} readOnly className={readonlyCls} placeholder="—" /></div>
              
              {}
              <div>
                <label className={labelReqCls}>Jumlah Masuk <span className="text-red-500">*</span></label>
                <input type="number" value={jumlah} onChange={e => setJumlah(e.target.value)} className={inputCls} placeholder="Masukkan jumlah..." min={1} />
              </div>
              <div>
                <label className={labelCls}>Stok Setelah Masuk</label>
                <div className="relative">
                  <input value={selectedBarang && jumlah ? stokSetelah : ''} readOnly className={`${readonlyCls} text-green-700 font-semibold`} placeholder="0" />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>

              {}
              <div className="sm:col-span-2">
                <label className={labelReqCls}>Keterangan</label>
                <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} className={`${inputCls} resize-none`} rows={3} placeholder="Masukkan keterangan (opsional)..." maxLength={200} />
                <p className="text-right text-xs text-gray-400 mt-0.5">{keterangan.length}/200</p>
              </div>
              
              <div className="sm:col-span-2">
                <label className={labelCls}>Petugas Input</label>
                <div className="relative">
                  <input value={user?.name || 'Petugas'} readOnly className={readonlyCls} />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={!barangId || !jumlah} className="flex-1 flex items-center justify-center gap-2 bg-[#0f4d2f] hover:bg-[#1f6744] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-md">
                <Save className="w-4 h-4" />Simpan Transaksi
              </button>
              <button onClick={() => {
              setBarangId('');
              setJumlah('');
              setKeterangan('');
              setTanggalMasuk(new Date().toISOString().split('T')[0]);
            }} className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                <RefreshCw className="w-4 h-4" />Reset
              </button>
            </div>
          </div>

          {}
          <div className="grid grid-cols-3 gap-3">
            {[{
            label: isAdmin ? 'Total Transaksi Masuk (Global)' : 'Transaksi Saya Hari Ini',
            val: filtered.length,
            sub: '',
            icon: <ArrowDownCircle className="w-4 h-4 text-green-700" />,
            bg: 'bg-green-100',
            color: 'text-green-700'
          }, {
            label: isAdmin ? 'Total Item Global' : 'Total Item Saya',
            val: totalItem,
            sub: '',
            icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
            bg: 'bg-blue-100',
            color: 'text-blue-600'
          }].map((s, i) => <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>{s.icon}</div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xs ${s.color} mt-0.5 font-medium`}>{s.sub}</p>
              </div>)}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              {lastTr ? <>
                  <p className="text-sm font-bold text-gray-900 truncate">{lastTr.namaBarang}</p>
                  <p className="text-xs text-gray-500">Barang Masuk Terakhir</p>
                  <p className="text-xs text-orange-500 mt-0.5 font-medium">{lastTr.jumlah} Pcs</p>
                </> : <p className="text-sm text-gray-400">Belum ada data</p>}
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">Alur Barang Masuk</h3>
          <p className="text-xs text-gray-500 mb-5">Proses sederhana dan otomatis</p>
          <div className="space-y-5">
            {[{
            num: 1,
            title: 'Input Barang Masuk',
            desc: 'Pilih barang, masukkan jumlah dan keterangan transaksi',
            icon: <ClipboardList className="w-4 h-4 text-white" />
          }, {
            num: 2,
            title: 'Simpan Transaksi',
            desc: 'Simpan transaksi barang masuk ke dalam sistem',
            icon: <Save className="w-4 h-4 text-white" />
          }, {
            num: 3,
            title: 'Update Stok Otomatis',
            desc: 'Stok barang akan bertambah otomatis sesuai jumlah masuk.',
            icon: <TrendingUp className="w-4 h-4 text-white" />
          }].map(step => <div key={step.num} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center flex-shrink-0">{step.icon}</div>
                  {step.num < 3 && <div className="w-0.5 h-8 bg-green-200 mt-1" />}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>)}
          </div>
          <div className="mt-5 bg-green-50 rounded-xl p-3 border border-green-100">
            <p className="text-xs text-green-700 font-medium">Data tersimpan aman dan stok selalu akurat ke database.</p>
          </div>
        </div>
      </div>

      {}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            {isAdmin ? "Daftar Semua Transaksi Barang Masuk (Admin)" : "Daftar Transaksi Saya (Petugas)"}
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Cari transaksi..." value={search} onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }} className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 w-48 text-gray-900" />
            </div>

            {isAdmin && <button onClick={handleExportPDF} className="flex items-center gap-1.5 border border-green-200 rounded-xl px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
                <Download className="w-3.5 h-3.5" />Export PDF
              </button>}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {}
                {['Tanggal', 'No. Transaksi', 'Kode Barang', 'Nama Barang', 'Supplier', 'Jumlah Masuk', 'Stok Sebelum', 'Stok Sesudah', 'Oleh', 'Aksi'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(t => <tr key={t.id} className="hover:bg-gray-50/50 transition-colors relative">
                  <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{t.tanggal}</td>
                  <td className="py-3 px-4 text-xs font-mono text-gray-700">{t.noTransaksi}</td>
                  <td className="py-3 px-4 text-xs font-mono text-gray-500">{t.kodeBarang}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{t.namaBarang}</td>
                  
                  {}
                  <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{t.supplier}</td>

                  <td className="py-3 px-4"><span className="font-semibold text-green-700">{t.jumlah} Pcs</span></td>
                  <td className="py-3 px-4 text-gray-500">{t.stokSebelum}</td>
                  <td className="py-3 px-4"><span className="font-semibold text-green-700">{t.stokSesudah}</span></td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-1 ${t.petugas === 'Admin' || t.petugas === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {t.petugas}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4 relative">
                    <button onClick={() => setActiveMenuId(activeMenuId === t.id ? null : String(t.id))} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeMenuId === String(t.id) && <div className="absolute right-4 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1.5 text-xs">
                        <button onClick={() => {
                    setSelectedTransaksi(t);
                    setIsEditMode(false);
                    setActiveMenuId(null);
                  }} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50">
                          <Eye className="w-3.5 h-3.5 text-blue-500" /> Detail Transaksi
                        </button>
                        
                        {isAdmin && <>
                            <hr className="my-1 border-gray-100" />
                            <button onClick={() => handleRollback(String(t.id))} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 font-medium">
                              <Trash2 className="w-3.5 h-3.5" /> Rollback Stok
                            </button>
                          </>}
                      </div>}
                  </td>
                </tr>)}
              {paged.length === 0 && <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-400 text-xs">Belum ada transaksi barang masuk</td>
                </tr>}
            </tbody>
          </table>
        </div>

        {}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-500">Menampilkan {filtered.length === 0 ? 0 : Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} dari {filtered.length} data</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 text-gray-600"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {Array.from({
            length: Math.min(totalPage, 5)
          }, (_, i) => i + 1).map(p => <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-green-700 text-white' : 'border border-gray-200 text-gray-600 hover:bg-white'}`}>{p}</button>)}
            <button onClick={() => setPage(p => Math.min(totalPage, p + 1))} disabled={page === totalPage || totalPage === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 text-gray-600"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {}
      {selectedTransaksi && <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-4">{isEditMode ? 'Edit Transaksi' : 'Detail Transaksi Barang Masuk'}</h4>
            
            <div className="space-y-3 text-xs text-gray-600">
              <p><strong>No Transaksi:</strong> {selectedTransaksi.noTransaksi}</p>
              <p><strong>Nama Barang:</strong> {selectedTransaksi.namaBarang} ({selectedTransaksi.kodeBarang})</p>
              <p><strong>Supplier:</strong> {selectedTransaksi.supplier}</p>
              <p><strong>Petugas:</strong> {selectedTransaksi.petugas}</p>
              
              <div>
                <label className="block font-medium mb-1 text-gray-700">Jumlah Masuk:</label>
                <input type="number" disabled={!isEditMode} defaultValue={selectedTransaksi.jumlah} className={inputCls} />
              </div>

              <div>
                <label className="block font-medium mb-1 text-gray-700">Keterangan:</label>
                <textarea disabled={!isEditMode} defaultValue={selectedTransaksi.keterangan} className={inputCls} rows={2} />
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setSelectedTransaksi(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-medium text-gray-600">
                Tutup
              </button>
            </div>
          </div>
        </div>}
    </div>;
}