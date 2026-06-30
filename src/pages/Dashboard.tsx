import { useState, useEffect, useRef } from 'react';
import { Package, ArrowDown, ArrowUp, AlertTriangle, MoreVertical, Loader2, Calendar, ChevronDown, Box, Download, Upload, ClipboardCheck, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const BASE_URL = 'http://localhost:8080/api';

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

const parseDateToISO = (dateVal: any) => {
  if (!dateVal) return '';
  if (Array.isArray(dateVal)) {
    return `${dateVal[0]}-${String(dateVal[1]).padStart(2, '0')}-${String(dateVal[2] || 1).padStart(2, '0')}`;
  }
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  try {
    return new Date(dateVal).toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const AnimatedNumber = ({
  value
}: {
  value: number;
}) => {
  const [count, setCount] = useState(0);
  const safeValue = Number(value) || 0;
  useEffect(() => {
    if (safeValue === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 1500;
    const increment = safeValue / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= safeValue) {
        setCount(safeValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [safeValue]);
  return <>{count}</>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = String(user?.role).toUpperCase() === 'ADMIN';
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [liveName, setLiveName] = useState('');

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [chartPeriodDays, setChartPeriodDays] = useState(7);
  const chartDropdownRef = useRef<HTMLDivElement>(null);
  
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(event.target as Node)) setShowChartDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLiveProfile = async () => {
      try {
        const headers = getHeaders();
        if (!headers['Authorization']) return;
        
        const res = await fetch(`${BASE_URL}/user/profile`, { headers });
        if (res.ok) {
          const data = await res.json();
          setLiveName(data.namaLengkap || data.name || '');
        }
      } catch (err) {
        console.error('Gagal mengambil nama terbaru:', err);
      }
    };

    if (user) {
      fetchLiveProfile();
    }
  }, [user]);

  useEffect(() => {
    const fetchAndAggregateData = async () => {
      try {
        setLoading(true);
        setError('');
        
        let currentUsername = user?.username || user?.name || '';
        const userStr = localStorage.getItem('inventaris_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          currentUsername = parsed.username || parsed.name || currentUsername;
        }
        
        const resBarang = await fetch(`${BASE_URL}/barang`, {
          headers: getHeaders()
        });
        if (!resBarang.ok) throw new Error('Gagal mengambil data barang');
        const rawBarang = await resBarang.json();
        
        let trxUrl = `${BASE_URL}/transaksi`;
        if (!isAdmin && currentUsername) {
          trxUrl += `?userId=${currentUsername}`;
        }
        
        const resTrx = await fetch(trxUrl, {
          headers: getHeaders()
        });
        if (!resTrx.ok) throw new Error('Gagal mengambil data transaksi');
        const rawTrx = await resTrx.json();
        
        const totalBarang = rawBarang.length;
        
        const daftarStokMenipis = rawBarang.filter((b: any) => {
          const stok = b.stokSaatIni ?? b.stok ?? 0;
          const minStok = b.minimumStok ?? b.minStok ?? 0;
          return stok <= minStok;
        }).map((b: any) => ({
          id: b.id,
          nama: b.namaBarang || b.nama,
          kode: b.kodeBarang || b.kode,
          stok: b.stokSaatIni ?? b.stok ?? 0,
          minStok: b.minimumStok ?? b.minStok ?? 0
        }));
        
        const filteredTrxByMonth = rawTrx.filter((t: any) => {
          const formattedDate = parseDateToISO(t.tanggal);
          return formattedDate.startsWith(selectedMonth);
        });
        
        const barangMasukBulanIni = filteredTrxByMonth.filter((t: any) => String(t.jenisTransaksi).toUpperCase() === 'MASUK').reduce((sum: number, t: any) => sum + Number(t.jumlah || 0), 0);
        const barangKeluarBulanIni = filteredTrxByMonth.filter((t: any) => String(t.jenisTransaksi).toUpperCase() === 'KELUAR').reduce((sum: number, t: any) => sum + Number(t.jumlah || 0), 0);
        
        const semuaRiwayatTransaksi = [...rawTrx].sort((a: any, b: any) => b.id - a.id);
        
        const grafikData = [];
        const today = new Date();
        for (let i = chartPeriodDays - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const displayDate = d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short'
          });
          const dayTrans = rawTrx.filter((t: any) => {
            const tDate = parseDateToISO(t.tanggal);
            return tDate === dateStr;
          });
          const masuk = dayTrans.filter((t: any) => String(t.jenisTransaksi).toUpperCase() === 'MASUK').reduce((sum: number, t: any) => sum + Number(t.jumlah || 0), 0);
          const keluar = dayTrans.filter((t: any) => String(t.jenisTransaksi).toUpperCase() === 'KELUAR').reduce((sum: number, t: any) => sum + Number(t.jumlah || 0), 0);
          grafikData.push({
            tanggal: displayDate,
            masuk,
            keluar
          });
        }
        
        setDashboardData({
          totalBarang,
          jumlahStokMenipis: daftarStokMenipis.length,
          daftarStokMenipis,
          barangMasukBulanIni,
          barangKeluarBulanIni,
          semuaRiwayatTransaksi,
          grafikTransaksi: grafikData
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchAndAggregateData();
    }
  }, [user, isAdmin, selectedMonth, chartPeriodDays]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-teal-500 dark:text-teal-400 animate-spin" />
      </div>;
  }

  if (error || !dashboardData) {
    return <div className="text-center text-red-500 dark:text-red-400 py-10 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/50 max-w-2xl mx-auto mt-10">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
        <p className="font-semibold text-base">{error}</p>
      </div>;
  }

  const allTrx = dashboardData.semuaRiwayatTransaksi || [];
  const totalTablePages = Math.ceil(allTrx.length / itemsPerPage);
  const pagedTransactions = allTrx.slice((tablePage - 1) * itemsPerPage, tablePage * itemsPerPage);
  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric'
  });

  return <div className="w-full h-full">
      <div className="space-y-3 max-w-[1600px] mx-auto font-sans text-slate-800 dark:text-slate-200 p-2 md:px-6 md:pt-4 md:pb-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
              Welcome {isAdmin ? 'Admin' : (liveName || user?.name || user?.username || 'User')}!
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {isAdmin ? 'Ringkasan Inventaris & Transaksi Global' : 'Ringkasan Transaksi Shift Anda'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 hover:border-teal-400 dark:hover:border-teal-500 transition-colors">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer bg-transparent" title="Pilih Bulan Laporan" />
          </div>
        </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
  <StatCard
    title="Total Jenis Barang"
    value={dashboardData.totalBarang}
    icon={<Box className="w-4 h-4 text-[#5592e6] dark:text-blue-400" />}
    cardBg="bg-[#eaf3ff] dark:bg-blue-900/20" 
    iconBg="bg-[#cce2ff] dark:bg-blue-500/20"
    trendLabel="Barang"
    valueColor="text-[#1a4a8a] dark:text-blue-100"
    trendColor="text-[#5592e6] dark:text-blue-400"
  />

  <StatCard
    title={isAdmin ? "Barang Masuk (Semua)" : "Barang Masuk (Shift)"}
    value={dashboardData.barangMasukBulanIni}
    icon={<Download className="w-4 h-4 text-[#3ba269] dark:text-emerald-400" />}
    cardBg="bg-[#e6f9ed] dark:bg-emerald-900/20" 
    iconBg="bg-[#c2efd4] dark:bg-emerald-500/20"
    trendLabel={monthName}
    valueColor="text-[#1a5c38] dark:text-emerald-100"
    trendColor="text-[#3ba269] dark:text-emerald-400"
  />

  <StatCard
    title={isAdmin ? "Barang Keluar (Semua)" : "Barang Keluar (Shift)"}
    value={dashboardData.barangKeluarBulanIni}
    icon={<Upload className="w-4 h-4 text-[#db4d4d] dark:text-red-400" />}
    cardBg="bg-[#feeeee] dark:bg-red-900/20" 
    iconBg="bg-[#fbcaca] dark:bg-red-500/20"
    trendLabel={monthName}
    valueColor="text-[#8c1a1a] dark:text-red-100"
    trendColor="text-[#db4d4d] dark:text-red-400"
  />

  <StatCard
    title="Peringatan Stok Menipis"
    value={dashboardData.jumlahStokMenipis}
    icon={<AlertTriangle className="w-4 h-4 text-[#e08920] dark:text-orange-400" />}
    cardBg="bg-[#fff5e6] dark:bg-orange-900/20" 
    iconBg="bg-[#ffe4b3] dark:bg-orange-500/20"
    trendLabel="Butuh Restock"
    valueColor="text-[#8a4a05] dark:text-orange-100"
    trendColor="text-[#e08920] dark:text-orange-400"
  />
</div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 bg-white dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isAdmin ? 'Grafik Transaksi Keseluruhan' : 'Grafik Transaksi Anda'}
              </h3>
              <div className="relative" ref={chartDropdownRef}>
                <button onClick={() => setShowChartDropdown(!showChartDropdown)} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  {chartPeriodDays === 7 ? '7 Hari Terakhir' : '30 Hari Terakhir'} <ChevronDown className="w-3 h-3" />
                </button>
                {showChartDropdown && <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-black/50 z-50 py-1 border border-slate-100 dark:border-slate-700">
                    <button onClick={() => {
                  setChartPeriodDays(7);
                  setShowChartDropdown(false);
                }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      7 Hari Terakhir
                    </button>
                    <button onClick={() => {
                  setChartPeriodDays(30);
                  setShowChartDropdown(false);
                }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      30 Hari Terakhir
                    </button>
                  </div>}
              </div>
            </div>
            
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.grafikTransaksi} margin={{
                top: 5,
                right: 0,
                left: -25,
                bottom: 0
              }}>
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#92d9b1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#92d9b1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59a9a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59a9a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{
                  fontSize: 10,
                  fill: '#64748b',
                  fontWeight: 500
                }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{
                  fontSize: 10,
                  fill: '#64748b',
                  fontWeight: 500
                }} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                  <Tooltip contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  background: 'var(--tw-prose-body, #ffffff)' 
                }} itemStyle={{
                  fontWeight: '500',
                  fontSize: '12px'
                }} />
                  <Legend iconType="circle" wrapperStyle={{
                  fontSize: '11px',
                  fontWeight: 500,
                  top: -10
                }} />
                  <Area 
                    name="Masuk" 
                    type="monotone" 
                    dataKey="masuk" 
                    stroke="#92d9b1" 
                    strokeWidth={2.5} 
                    fill="url(#colorMasuk)" 
                    activeDot={{
                      r: 4,
                      fill: '#92d9b1', 
                      strokeWidth: 0
                    }} 
                  />
                  <Area 
                    name="Keluar" 
                    type="monotone" 
                    dataKey="keluar" 
                    stroke="#f59a9a" 
                    strokeWidth={2.5} 
                    fill="url(#colorKeluar)" 
                    activeDot={{
                      r: 4,
                      fill: '#f59a9a', 
                      strokeWidth: 0
                    }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Daftar Stok Menipis</h3>
              <button className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><MoreVertical className="w-3.5 h-3.5" /></button>
            </div>

            <div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar max-h-[210px]">
              {dashboardData.daftarStokMenipis?.length > 0 ? dashboardData.daftarStokMenipis.slice(0, 5).map((b: any, index: number) => <div key={b.id || index} className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#feecd0] dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#d4780a] dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate max-w-[140px] xl:max-w-[200px]">{b.nama}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{b.kode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#cc3333] dark:text-red-400">{b.stok}</p>
                      <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">Min: {b.minStok}</p>
                    </div>
                  </div>) : <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ClipboardCheck className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Semua stok aman saat ini.</p>
                </div>}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/10 mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {isAdmin ? 'Riwayat Transaksi (Semua Petugas)' : 'Riwayat Transaksi (Shift Anda)'}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Tanggal', 'Jenis', 'Nama Barang', 'Jumlah', 'Petugas', ''].map(h => <th key={h} className="py-2 px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {pagedTransactions.map((t: any, index: number) => {
                const tDate = parseDateToISO(t.tanggal);
                return <tr key={t.id || index} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] font-medium whitespace-nowrap">
                        {tDate ? new Date(tDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${String(t.jenisTransaksi).toUpperCase() === 'MASUK' ? 'bg-[#d4f5e2] dark:bg-emerald-900/30 text-[#1a5c38] dark:text-emerald-400' : 'bg-[#fde0e0] dark:bg-red-900/30 text-[#8c1a1a] dark:text-red-400'}`}>
                          {String(t.jenisTransaksi).toUpperCase() === 'MASUK' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-700 dark:text-slate-200">{t.barang?.namaBarang || t.barang?.nama || '-'}</td>
                      <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t.jumlah} {t.barang?.satuan || 'Pcs'}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] font-medium">{t.user?.name || t.user?.username || 'System'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>;
              })}
                {pagedTransactions.length === 0 && <tr>
                    <td colSpan={6} className="text-center py-6 text-xs text-gray-400 dark:text-slate-500">Belum ada transaksi</td>
                  </tr>}
              </tbody>
            </table>
          </div>

          {allTrx.length > 0 && <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Menampilkan {Math.min((tablePage - 1) * itemsPerPage + 1, allTrx.length)} - {Math.min(tablePage * itemsPerPage, allTrx.length)} dari {allTrx.length} data
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1} className="w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))} disabled={tablePage === totalTablePages} className="w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>}
        </div>

      </div>
    </div>;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  cardBg: string;
  iconBg: string;
  trendLabel: string;
  valueColor: string;
  trendColor: string;
}

function StatCard({
  title,
  value,
  icon,
  cardBg,
  iconBg,
  trendLabel,
  valueColor,
  trendColor
}: StatCardProps) {
  return (
    <div className={`${cardBg} rounded-2xl p-4 shadow-sm border border-white/60 dark:border-white/5 flex flex-col justify-between transition-all hover:shadow-md cursor-default relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <MoreVertical className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors" />
      </div>
      <div className="relative z-10">
        <p className={`text-[11px] font-medium mb-0.5 opacity-75 ${valueColor}`}>{title}</p>
        <p className={`text-2xl font-bold tracking-tight leading-none mb-1 ${valueColor}`}>
          <AnimatedNumber value={value} />
        </p>
        <p className={`text-[9px] font-semibold flex gap-1 ${trendColor}`}>
          • <span className="opacity-70 font-medium">{trendLabel}</span>
        </p>
      </div>
      <div className="absolute right-3 bottom-3 flex items-end gap-1 opacity-[0.08] pointer-events-none">
        <div className="w-1.5 h-3 bg-current rounded-sm"></div>
        <div className="w-1.5 h-7 bg-current rounded-sm"></div>
        <div className="w-1.5 h-5 bg-current rounded-sm"></div>
        <div className="w-1.5 h-9 bg-current rounded-sm"></div>
      </div>
    </div>
  );
}