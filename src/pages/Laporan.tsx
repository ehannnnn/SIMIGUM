import { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, Calendar, Printer, BarChart2, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function useCountUp(target: number, duration = 1300, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const raf = requestAnimationFrame(function step(ts) {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}

// Palet pastel senada card: biru, hijau, merah/rose, peach/orange — tanpa ungu, tanpa warna mencolok
const BAR_PALETTE = [
  { fill: '#ddeeff', stroke: '#5592e6', dot: '#5592e6', hatch: '#5592e6' },   // biru (card 1)
  { fill: '#d4f5e2', stroke: '#3ba269', dot: '#3ba269', hatch: '#3ba269' },   // hijau (card 2)
  { fill: '#ffd6d6', stroke: '#db4d4d', dot: '#db4d4d', hatch: '#db4d4d' },   // merah muda (card 3)
  { fill: '#ffe8cc', stroke: '#e08920', dot: '#e08920', hatch: '#e08920' },   // peach (card 4)
  { fill: '#cceeff', stroke: '#3a9bc7', dot: '#3a9bc7', hatch: '#3a9bc7' },   // biru muda
  { fill: '#c8f0d8', stroke: '#2e8b57', dot: '#2e8b57', hatch: '#2e8b57' },   // hijau tua
  { fill: '#fce8e8', stroke: '#cc3333', dot: '#cc3333', hatch: '#cc3333' },   // rose muda
  { fill: '#fef3c7', stroke: '#d4780a', dot: '#d4780a', hatch: '#d4780a' },   // kuning hangat
];

function SketchyPillBar({
  heightPct,
  palette,
  isHov,
  animateIn,
  delay,
  idx,
  value,
  label,
}: {
  heightPct: number;
  palette: typeof BAR_PALETTE[0];
  isHov: boolean;
  animateIn: boolean;
  delay: number;
  idx: number;
  value: number;
  label: string;
}) {
  const patternId = `hatch-${idx}`;
  const trackH = 180;
  const barH = animateIn ? Math.max(heightPct / 100 * trackH, heightPct > 0 ? 18 : 0) : 0;

  return (
    <div className="relative flex flex-col items-center" style={{ width: 48 }}>
      {isHov && (
        <div className="absolute z-30 pointer-events-none"
          style={{ bottom: trackH + 12, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="bg-slate-800 text-white rounded-xl px-3 py-2 text-[11px] font-bold whitespace-nowrap shadow-xl">
            <p className="text-[9px] font-medium text-slate-400 mb-0.5">{label}</p>
            {value.toLocaleString('id-ID')}
          </div>
          <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
        </div>
      )}

      <div
        className="relative overflow-hidden"
        style={{
          width: 36,
          height: trackH,
          borderRadius: 999,
          background: '#e8edf2',
        }}
      >
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke={palette.hatch} strokeWidth="2.5" strokeOpacity="0.35" />
            </pattern>
          </defs>
        </svg>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: barH,
            borderRadius: 999,
            background: palette.fill,
            border: `2px solid ${palette.stroke}`,
            transition: `height 0.85s cubic-bezier(0.34,1.15,0.64,1) ${delay}s`,
            overflow: 'hidden',
          }}
        >
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        </div>

        {heightPct > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: barH - 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#fff',
              border: `2.5px solid ${palette.dot}`,
              transition: `bottom 0.85s cubic-bezier(0.34,1.15,0.64,1) ${delay}s`,
              zIndex: 10,
              boxShadow: `0 0 0 3px ${palette.fill}`,
            }}
          />
        )}
      </div>

      <span className={`mt-2 text-[11px] font-semibold transition-colors ${isHov ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

function PillBarChart({ data, animateIn }: { data: any[]; animateIn: boolean }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  if (!data || data.length === 0) {
    return <div className="h-32 flex items-center justify-center text-xs text-slate-400">Tidak ada data grafik</div>;
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.masuk || 0, d.keluar || 0, d.nilai || 0, d.total || 0)), 1);

  return (
    <div className="w-full">
      <div className="flex gap-0 items-end">
        <div className="flex flex-col justify-between pr-3 text-right shrink-0" style={{ height: 220 }}>
          {[maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map((v, i) => (
            <span key={i} className="text-[10px] text-slate-300 font-medium leading-none">
              {v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            </span>
          ))}
        </div>

        <div className="flex-1 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: 220 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`w-full ${i === 4 ? 'border-t border-slate-200' : 'border-t border-dashed border-slate-100'}`} />
            ))}
          </div>

          <div className="flex items-end justify-around" style={{ height: 220 }}>
            {data.map((d, i) => {
              const val = d.masuk || d.keluar || d.nilai || d.total || 0;
              const pct = (val / maxVal) * 100;
              const palette = BAR_PALETTE[i % BAR_PALETTE.length];
              return (
                <div
                  key={i}
                  className="flex flex-col items-center cursor-pointer"
                  onMouseEnter={() => setHovIdx(i)}
                  onMouseLeave={() => setHovIdx(null)}
                >
                  <SketchyPillBar
                    heightPct={pct}
                    palette={palette}
                    isHov={hovIdx === i}
                    animateIn={animateIn}
                    delay={0.05 * i}
                    idx={i}
                    value={val}
                    label={String(d.tanggal || '')}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Category progress bars — pastel multi-color
const katColors = [
  { bar: 'linear-gradient(90deg,#3a7bd5,#bbd4f8)', shadow: '#3a7bd540' },
  { bar: 'linear-gradient(90deg,#2e8b57,#aee8c8)', shadow: '#2e8b5740' },
  { bar: 'linear-gradient(90deg,#cc3333,#f8bebe)', shadow: '#cc333340' },
  { bar: 'linear-gradient(90deg,#d4780a,#fdd9a0)', shadow: '#d4780a40' },
  { bar: 'linear-gradient(90deg,#7c5c9e,#cfc0e8)', shadow: '#7c5c9e40' },
];

function CategoryBar({ kat, animateIn, delay, colorIdx }: { kat: any; animateIn: boolean; delay: number; colorIdx: number }) {
  const col = katColors[colorIdx % katColors.length];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{kat.nama}</span>
        <span className="text-[11px] font-medium text-slate-400">{kat.jumlah} unit · {kat.persentase}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full"
          style={{
            background: col.bar,
            width: animateIn ? `${kat.persentase}%` : '0%',
            transition: animateIn ? `width 0.9s cubic-bezier(0.34,1.15,0.64,1) ${delay}s` : 'none',
            boxShadow: animateIn ? `0 1px 8px 0 ${col.shadow}` : 'none',
          }}
        />
      </div>
    </div>
  );
}

const statCardStyles = [
  { bg: 'bg-[#eaf3ff]', iconBg: 'bg-[#cce2ff]', textColor: 'text-[#1a4a8a]', iconColor: 'text-[#5592e6]' },
  { bg: 'bg-[#e6f9ed]', iconBg: 'bg-[#c2efd4]', textColor: 'text-[#1a5c38]', iconColor: 'text-[#3ba269]' },
  { bg: 'bg-[#feeeee]', iconBg: 'bg-[#fbcaca]', textColor: 'text-[#8c1a1a]', iconColor: 'text-[#db4d4d]' },
  { bg: 'bg-[#fff5e6]', iconBg: 'bg-[#ffe4b3]', textColor: 'text-[#8a4a05]', iconColor: 'text-[#e08920]' },
];

function StatCard({ label, rawValue, unit, icon, cardIdx, animateIn }: any) {
  const isNum = typeof rawValue === 'number';
  const count = useCountUp(isNum ? rawValue : 0, 1300, animateIn);
  const style = statCardStyles[cardIdx % statCardStyles.length];
  return (
    <div className={`${style.bg} rounded-xl p-4 border border-white/60 shadow-sm flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
        <span className={style.iconColor}>{icon}</span>
      </div>
      <div>
        <p className={`text-[11px] font-medium mb-0.5 opacity-75 ${style.textColor}`}>{label}</p>
        <p className={`text-xl font-bold tracking-tight leading-none ${style.textColor}`}>
          {isNum ? count.toLocaleString('id-ID') : rawValue}
        </p>
        <p className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-60 ${style.textColor}`}>{unit}</p>
      </div>
    </div>
  );
}

function CurrencyCard({ value, animateIn }: { value: number; animateIn: boolean }) {
  const count = useCountUp(value, 1500, animateIn);
  const style = statCardStyles[3];
  return (
    <div className={`${style.bg} rounded-xl p-4 border border-white/60 shadow-sm flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
        <BarChart2 className={`w-5 h-5 ${style.iconColor}`} />
      </div>
      <div>
        <p className={`text-[11px] font-medium mb-0.5 opacity-75 ${style.textColor}`}>Total Nilai Stok</p>
        <p className={`text-xl font-bold tracking-tight leading-none ${style.textColor}`}>
          Rp {count.toLocaleString('id-ID')}
        </p>
        <p className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-60 ${style.textColor}`}>Rupiah</p>
      </div>
    </div>
  );
}

function formatTanggal(val: any): string {
  if (!val) return '-';
  if (typeof val === 'string' && !isNaN(Date.parse(val))) {
    const d = new Date(val);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (typeof val === 'string') return val;
  return String(val);
}

function getField(row: any, ...keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return null;
}

function extractString(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const nameKeys = ['nama', 'name', 'namaSupplier', 'supplier', 'namaTujuan', 'namaKategori', 'supplierName', 'tujuanName', 'kategoriName', 'label', 'title'];
    for (const k of nameKeys) {
      if (val[k] && typeof val[k] === 'string') return val[k];
    }
    for (const k of Object.keys(val)) {
      if (typeof val[k] === 'string' && val[k].length > 0) return val[k];
    }
  }
  return null;
}

function resolveDynamicName(b: any, tab: 'masuk' | 'keluar' | 'stok'): string {
  const candidates: any[] = [];
  if (tab === 'masuk') {
    candidates.push(b.supplier, b.namaSupplier, b.Supplier, b.supplierName, b.supplier_name, b.nama_supplier, b.pihak, b.namaPihak, b.from, b.dari, b.namaFrom, b.supplierData, b.supplierInfo, b.barang?.supplier, b.transaksi?.supplier, b.detail?.supplier, b.item?.supplier, b.Supplier?.nama, b.supplier?.nama);
  } else if (tab === 'keluar') {
    candidates.push(b.tujuan, b.namaTujuan, b.Tujuan, b.destination, b.tujuan_name, b.nama_tujuan, b.pihak, b.namaPihak, b.to, b.ke, b.namaTo, b.tujuanData, b.tujuanInfo, b.barang?.tujuan, b.transaksi?.tujuan, b.detail?.tujuan, b.item?.tujuan, b.Tujuan?.nama, b.tujuan?.nama);
  } else {
    candidates.push(b.kategori, b.namaKategori, b.Kategori, b.category, b.kategori_name, b.nama_kategori, b.kategoriData, b.kategoriInfo, b.Kategori?.nama, b.kategori?.nama);
  }
  for (const c of candidates) {
    const s = extractString(c);
    if (s) return s;
  }
  const keyword = tab === 'masuk' ? 'suppli' : tab === 'keluar' ? 'tuju' : 'kateg';
  for (const k of Object.keys(b)) {
    if (k.toLowerCase().includes(keyword)) {
      const s = extractString(b[k]);
      if (s) return s;
    }
  }
  return '-';
}

export default function Laporan() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [jenisLaporan, setJenisLaporan] = useState('Semua Laporan');
  const [dariTanggal, setDariTanggal] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [sampaiTanggal, setSampaiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'masuk' | 'keluar' | 'stok'>('masuk');
  const [periodType, setPeriodType] = useState<'harian' | 'mingguan' | 'bulanan'>('mingguan');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jenisTransaksi, setJenisTransaksi] = useState('SEMUA');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggerFetch, setTriggerFetch] = useState(0);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setAnimateIn(false);
      setError('');
      try {
        let token = localStorage.getItem('token');
        if (!token && user && (user as any).token) token = (user as any).token;
        if (!token) throw new Error('Token tidak ditemukan. Silakan login ulang.');
        const params = new URLSearchParams({ search: searchQuery, jenis: jenisTransaksi, dari: dariTanggal, sampai: sampaiTanggal, periode: periodType });
        const res = await fetch(`https://simigum-production.up.railway.app/api/laporan?${params}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Gagal mengambil data laporan dari server');
        const json = await res.json();
        setReportData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setTimeout(() => setAnimateIn(true), 80);
      }
    };
    fetch_();
  }, [triggerFetch, periodType]);

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 180);
    return () => clearTimeout(t);
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setTriggerFetch(p => p + 1);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      let token = localStorage.getItem('token');
      if (!token && user && (user as any).token) token = (user as any).token;
      if (!token) return alert('Sesi berakhir, silakan login ulang.');
      const params = new URLSearchParams({ search: searchQuery, jenis: jenisTransaksi, dari: dariTanggal, sampai: sampaiTanggal, periode: periodType });
      const res = await fetch(`https://simigum-production.up.railway.app/api/laporan/export/${format}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Gagal mengunduh laporan ${format.toUpperCase()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_${dariTanggal}_${sampaiTanggal}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fallback = {
    totalMasuk: 256,
    totalKeluar: 172,
    nilaiStok: 125450000,
    chartData: [
      { tanggal: 'Mon', masuk: 18000 },
      { tanggal: 'Tue', masuk: 32000 },
      { tanggal: 'Wed', masuk: 45000 },
      { tanggal: 'Thu', masuk: 28000 },
      { tanggal: 'Fri', masuk: 38000 },
      { tanggal: 'Sat', masuk: 22000 },
      { tanggal: 'Sun', masuk: 15000 },
    ],
    kategoriBreakdown: [
      { nama: 'Elektronik', jumlah: 120, persentase: 35 },
      { nama: 'Bangunan', jumlah: 85, persentase: 25 },
      { nama: 'Plastik', jumlah: 60, persentase: 18 },
      { nama: 'Lainnya', jumlah: 74, persentase: 22 },
    ],
    detailMasuk: [
      { id: 1, kode: 'BM-2024-0056', supplier: 'PT Sumber Jaya Abadi', kategori: 'Elektronik', stok: 125, minStok: 20, satuan: 'pcs', harga: 150000, namaBarang: 'Kabel Ties', tanggal: '2024-05-24T14:40:00', oleh: 'Admin' },
      { id: 2, kode: 'BM-2024-0055', supplier: 'CV Makmur Sejahtera', kategori: 'Bangunan', stok: 90, minStok: 15, satuan: 'pcs', harga: 138000, namaBarang: 'Semen 50kg', tanggal: '2024-05-24T11:25:00', oleh: 'Admin' },
    ],
    detailKeluar: [
      { id: 6, kode: 'BK-2024-0051', tujuan: 'PT Global Parts', kategori: 'Lainnya', stok: 10, minStok: 20, satuan: 'pcs', harga: 170000, namaBarang: 'Bearing', tanggal: '2024-05-22T15:20:00', oleh: 'Petugas 2' },
    ],
    detailStok: [
      { id: 9, kode: 'STK-2024-0048', nama: 'PT Nusantara Supplies', kategori: 'Elektronik', stok: 70, minStok: 25, satuan: 'pcs', harga: 114000, namaBarang: 'Lampu LED', tanggal: '2024-05-21T09:30:00', oleh: 'Petugas 1' },
    ],
  };

  const data = reportData || fallback;

  const getTabData = () => {
    if (data.riwayatTransaksi) {
      if (activeTab === 'masuk') return data.riwayatTransaksi.filter((t: any) => t.jenisTransaksi === 'MASUK');
      if (activeTab === 'keluar') return data.riwayatTransaksi.filter((t: any) => t.jenisTransaksi === 'KELUAR');
    }
    if (activeTab === 'masuk') return data.detailMasuk || data.barangMasuk || data.masuk || data.detailStok || [];
    if (activeTab === 'keluar') return data.detailKeluar || data.barangKeluar || data.keluar || data.detailStok || [];
    return data.detailStok || data.stok || [];
  };

  const tabData = getTabData();
  const totalPages = Math.ceil((tabData.length || 0) / pageSize);
  const paginatedData = tabData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const tabHeaders = ['Laporan Barang Masuk', 'Laporan Barang Keluar', 'Laporan Stok'];
  const tabKeys: ('masuk' | 'keluar' | 'stok')[] = ['masuk', 'keluar', 'stok'];

  const getTableHeaders = () => {
    if (activeTab === 'masuk') {
      return ['No', 'Tanggal', 'No. Transaksi', 'Supplier', 'Nama Barang', 'Total Qty', 'Total Nilai', 'Status', 'Oleh'];
    } else if (activeTab === 'keluar') {
      return ['No', 'Tanggal', 'No. Transaksi', 'Nama Barang', 'Total Qty', 'Total Nilai', 'Status', 'Oleh'];
   } else {
      return ['No', 'No. Transaksi', 'Kategori', 'Nama Barang', 'Total Qty', 'Total Nilai', 'Status'];
    }
  };

  const colSpanCount = getTableHeaders().length;

  // Helper: resolve tanggal & oleh khusus stok dengan fallback lebih luas
  const resolveStokTanggal = (b: any): any => {
    return getField(
      b,
      'tanggal', 'createdAt', 'created_at', 'tglTransaksi', 'date',
      'updatedAt', 'updated_at', 'tglUpdate', 'lastUpdated', 'last_updated',
      'tglMasuk', 'tglKeluar', 'tglStok', 'waktu',
      'barang.tanggal', 'barang.createdAt', 'barang.updatedAt',
      'item.tanggal', 'item.createdAt', 'item.updatedAt',
    ) ?? (b.barang?.tanggal || b.barang?.createdAt || b.barang?.updatedAt || b.item?.tanggal || b.item?.createdAt || null);
  };

  const resolveStokOleh = (b: any): string => {
    const val = getField(
      b,
      'oleh', 'createdBy', 'created_by', 'user', 'petugas', 'operator',
      'updatedBy', 'updated_by', 'modifiedBy', 'modified_by',
      'lastModifiedBy', 'last_modified_by', 'inputBy', 'input_by',
      'userName', 'username', 'userNama', 'namaUser',
    ) ?? (b.barang?.oleh || b.barang?.createdBy || b.item?.oleh || b.item?.createdBy || null);
    if (!val) return '-';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.nama || val.name || val.username || '-';
    return String(val);
  };

  return (
    <div className="w-full min-h-full font-sans">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
          <form onSubmit={handleFilterSubmit}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select value={jenisLaporan} onChange={e => setJenisLaporan(e.target.value)} className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 cursor-pointer">
                  <option>Semua Laporan</option>
                  <option>Barang Masuk</option>
                  <option>Barang Keluar</option>
                  <option>Laporan Stok</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:border-slate-300 transition-colors">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input type="date" value={dariTanggal} onChange={e => setDariTanggal(e.target.value)} className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer" />
              </div>
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:border-slate-300 transition-colors">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input type="date" value={sampaiTanggal} onChange={e => setSampaiTanggal(e.target.value)} className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer" />
              </div>
              <button type="submit" className="flex items-center gap-1.5 bg-[#0f4d2f] hover:bg-[#1f6744]   text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm">
                <Search className="w-4 h-4" /> Tampilkan
              </button>
              <div className="flex-1" />
              <button type="button" onClick={() => handleExport('excel')} className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors">
                <Download className="w-4 h-4 text-slate-400" /> Export Excel
              </button>
              <button type="button" onClick={() => handleExport('pdf')} className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors">
                <Printer className="w-4 h-4 text-slate-400" /> Export PDF
              </button>
            </div>
          </form>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#eaf3ff] rounded-xl border border-white/60 shadow-sm p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#cce2ff] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#5592e6]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#1a4a8a] uppercase tracking-wide opacity-70">Ringkasan Periode</p>
                <p className="text-[11px] font-bold text-[#1a4a8a]">{dariTanggal}</p>
                <p className="text-[11px] font-bold text-[#1a4a8a]">{sampaiTanggal}</p>
              </div>
            </div>
            <div className="flex gap-1 pt-2 border-t border-[#cce2ff]">
              {(['harian', 'mingguan', 'bulanan'] as const).map(p => (
                <button key={p} type="button" onClick={() => setPeriodType(p)}
                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold capitalize transition-all ${periodType === p ? 'bg-[#3a7bd5] text-white' : 'bg-[#cce2ff]/60 text-[#1a4a8a] hover:bg-[#cce2ff]'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <StatCard label="Total Barang Masuk" rawValue={data.totalMasuk} unit="transaksi" icon={<TrendingUp className="w-5 h-5" />} cardIdx={1} animateIn={animateIn} />
          <StatCard label="Total Barang Keluar" rawValue={data.totalKeluar} unit="transaksi" icon={<TrendingDown className="w-5 h-5" />} cardIdx={2} animateIn={animateIn} />
          <CurrencyCard value={data.nilaiStok} animateIn={animateIn} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Total Sales Overview</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Distribusi transaksi per periode</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {BAR_PALETTE.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full border-2" style={{ background: p.fill, borderColor: p.stroke }} />
                  </div>
                ))}
              </div>
            </div>
            <PillBarChart data={data.chartData} animateIn={animateIn} />
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-0.5">Proporsi Barang per Kategori</h3>
            <p className="text-[11px] text-slate-400 mb-5">Distribusi stok berdasarkan kategori</p>
            <div className="space-y-4">
              {(data.kategoriBreakdown || []).map((kat: any, i: number) => (
                <CategoryBar key={kat.nama} kat={kat} animateIn={animateIn} delay={0.1 + i * 0.13} colorIdx={i} />
              ))}
              {(!data.kategoriBreakdown || data.kategoriBreakdown.length === 0) && (
                <div className="text-xs text-slate-400 text-center py-8">Data kategori tidak tersedia</div>
              )}
            </div>
          </div>
        </div>

        {/* Detail table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 pt-4">
            <div className="flex">
              {tabKeys.map((key, i) => (
                <button key={key} type="button" onClick={() => { setActiveTab(key); setCurrentPage(1); }}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${activeTab === key ? 'border-[#3a7bd5] text-[#3a7bd5]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
                  {tabHeaders[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'masuk' ? 'Laporan Barang Masuk' : activeTab === 'keluar' ? 'Laporan Barang Keluar' : 'Laporan Stok'}
            </h3>
            <span className="text-xs text-slate-400">
              Total Nilai Aset: <span className="text-[#2e8b57] font-bold">Rp {(data.nilaiStok || 0).toLocaleString('id-ID')}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  {getTableHeaders().map(h => (
                    <th key={h} className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={colSpanCount} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-[#3a7bd5]" />
                      <span className="text-xs">Memuat data laporan...</span>
                    </div>
                  </td></tr>
                ) : error ? (
                  <tr><td colSpan={colSpanCount} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-rose-400">
                      <AlertTriangle className="w-6 h-6" />
                      <span className="text-xs font-medium">{error}</span>
                    </div>
                  </td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={colSpanCount} className="py-14 text-center text-xs text-slate-400">Tidak ada data untuk periode yang dipilih</td></tr>
                ) : paginatedData.map((b: any, idx: number) => {
                  const rowNo = (currentPage - 1) * pageSize + idx + 1;
                  const kode = getField(b, 'kode', 'noTransaksi', 'no_transaksi', 'code', 'transactionCode') ?? '-';

                  // FIX: gunakan resolver khusus stok agar tanggal & oleh tidak "-"
                  const tanggal = activeTab === 'stok' ? resolveStokTanggal(b) : getField(
                    b,
                    'tanggal', 'createdAt', 'created_at', 'tglTransaksi', 'date',
                    'updatedAt', 'updated_at', 'tglUpdate', 'lastUpdated', 'last_updated',
                    'tglMasuk', 'tglKeluar', 'tglStok', 'waktu'
                  );
                  const oleh = activeTab === 'stok' ? resolveStokOleh(b) : (getField(
                    b,
                    'oleh', 'createdBy', 'created_by', 'user', 'petugas', 'operator',
                    'updatedBy', 'updated_by', 'modifiedBy', 'modified_by',
                    'lastModifiedBy', 'last_modified_by', 'inputBy', 'input_by'
                  ) ?? '-');

                  const dynamicName = resolveDynamicName(b, activeTab);
                  let namaBarang = getField(b, 'namaBarang', 'nama', 'barang');
                  if (typeof namaBarang === 'object' && namaBarang !== null) {
                    namaBarang = namaBarang.namaBarang || namaBarang.nama || '-';
                  }
                  const stok = getField(b, 'stok', 'qty', 'quantity', 'jumlah', 'totalQty', 'total_qty') ?? 0;
                  const minStok = getField(b, 'minStok', 'min_stok', 'minimumStok', 'minStock') ?? 0;
                  const satuan = getField(b, 'satuan', 'unit') ?? 'pcs';
                  const harga = getField(b, 'harga', 'price', 'hargaSatuan', 'unitPrice') ?? 0;
                  const isLow = Number(stok) <= Number(minStok);
                  const nilaiStok = Number(harga) * Number(stok);

                  return (
                    <tr key={b.id || b.kode || idx} className="border-b border-slate-50 hover:bg-[#eaf3ff]/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400">{rowNo}</td>
                    {activeTab !== 'stok' && (
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">{tanggal ? formatTanggal(tanggal) : '-'}</td>
                    )}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#3a7bd5] font-bold">{kode}</td>

                      {activeTab !== 'keluar' && (
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700">{dynamicName}</td>
                      )}

                      <td className="py-3 px-4 text-xs text-slate-600 font-medium">{namaBarang || '-'}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-700">{stok} {satuan}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-700 whitespace-nowrap">Rp {nilaiStok.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {isLow
                          ? <span className="bg-[#feeeee] text-[#8c1a1a] px-2 py-0.5 rounded text-[9px] font-bold">Menipis</span>
                          : <span className="bg-[#e6f9ed] text-[#1a5c38] px-2 py-0.5 rounded text-[9px] font-bold">Aman</span>
                        }
                      </td>
                      {activeTab !== 'stok' && (
                        <td className="py-3 px-4 text-xs text-slate-500">{oleh}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Menampilkan {tabData.length === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, tabData.length)}–{Math.min(currentPage * pageSize, tabData.length)} dari {tabData.length} data
            </span>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 bg-white focus:outline-none cursor-pointer">
                {[5, 10, 25, 50].map(s => <option key={s} value={s}>{s} / halaman</option>)}
              </select>
              <div className="flex items-center gap-1">
                {([
                  { icon: <ChevronsLeft className="w-3.5 h-3.5" />, fn: () => setCurrentPage(1), dis: currentPage === 1 },
                  { icon: <ChevronLeft className="w-3.5 h-3.5" />, fn: () => setCurrentPage(p => Math.max(1, p - 1)), dis: currentPage === 1 },
                ] as any[]).map((b, i) => (
                  <button key={i} type="button" onClick={b.fn} disabled={b.dis} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{b.icon}</button>
                ))}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                  return (
                    <button key={p} type="button" onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${currentPage === p ? 'bg-[#0f4d2f]  text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      {p}
                    </button>
                  );
                })}
                {([
                  { icon: <ChevronRight className="w-3.5 h-3.5" />, fn: () => setCurrentPage(p => Math.min(totalPages, p + 1)), dis: currentPage === totalPages || totalPages === 0 },
                  { icon: <ChevronsRight className="w-3.5 h-3.5" />, fn: () => setCurrentPage(totalPages), dis: currentPage === totalPages || totalPages === 0 },
                ] as any[]).map((b, i) => (
                  <button key={i} type="button" onClick={b.fn} disabled={b.dis} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{b.icon}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          form, button { display: none !important; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 8px !important; font-size: 11px !important; }
        }
      `}</style>
    </div>
  );
}