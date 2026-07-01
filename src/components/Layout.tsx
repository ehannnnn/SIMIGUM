import { ReactNode, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle, History, FileText, Users, LogOut, ChevronDown, Menu, X, Scan, Bell, Calendar, User, Sun, Moon, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface ActivityNotif {
  id: number;
  pesan: string;
  waktu: string;
  isRead: boolean;
}

const PAGE_META: Record<string, { title: string; subtitle: string; }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Selamat datang kembali! Kelola inventaris dengan mudah.' },
  'data-barang': { title: 'Data Barang', subtitle: 'Kelola semua data barang inventaris gudang.' },
  'barang-masuk': { title: 'Barang Masuk', subtitle: 'Input data barang yang masuk ke gudang.' },
  'barang-keluar': { title: 'Barang Keluar', subtitle: 'Input data barang yang keluar dari gudang.' },
  riwayat: { title: 'Riwayat Transaksi', subtitle: 'Lihat seluruh riwayat transaksi barang.' },
  laporan: { title: 'Laporan', subtitle: 'Lihat dan ekspor laporan inventaris gudang.' },
  'kelola-user': { title: 'Kelola User', subtitle: 'Manajemen pengguna sistem inventaris.' },
  'scan-barang': { title: 'Scan Barang', subtitle: 'Scan QR code atau barcode untuk cek stok.' },
  profil: { title: 'Profil', subtitle: 'Kelola informasi akun dan kata sandi Anda.' }
};

const getSafeToken = () => {
  let token = localStorage.getItem('token');
  if (!token) {
    const userStr = localStorage.getItem('inventaris_user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        token = userData.token || userData.accessToken || userData.jwt;
      } catch (e) {}
    }
  }
  if (token) token = token.replace(/"/g, '');
  return token;
};

function PortalDropdown({
  anchorRef,
  panelRef,
  open,
  children
}: {
  anchorRef: React.RefObject<HTMLElement>;
  panelRef: React.RefObject<HTMLDivElement>;
  open: boolean;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [open, anchorRef]);
  if (!open) return null;
  return createPortal(
    <div ref={panelRef} style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}>
      {children}
    </div>, 
    document.body
  );
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  
  const [transaksiOpen, setTransaksiOpen] = useState(['barang-masuk', 'barang-keluar', 'riwayat'].includes(currentPage));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  
  const [notifications, setNotifications] = useState<ActivityNotif[]>([]);
  const [lastReadId, setLastReadId] = useState<number>(0);
  const [liveProfile, setLiveProfile] = useState({ namaLengkap: '', fotoProfil: '' });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      const clickedBell = bellBtnRef.current?.contains(t);
      const clickedProfile = profileBtnRef.current?.contains(t);
      const clickedNotifPanel = notifPanelRef.current?.contains(t);
      const clickedProfilePanel = profilePanelRef.current?.contains(t);

      if (!clickedBell && !clickedNotifPanel) setNotifOpen(false);
      if (!clickedProfile && !clickedProfilePanel) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setLiveProfile({ namaLengkap: '', fotoProfil: '' });
  }, [user?.username]);

  useEffect(() => {
    if (user?.username) {
      const stored = localStorage.getItem(`notif_read_${user.username}`);
      if (stored) setLastReadId(parseInt(stored));
    }
  }, [user?.username]);

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const meta = PAGE_META[currentPage] || { title: 'Inventaris Gudang', subtitle: '' };
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const fetchNotifikasi = async () => {
    try {
      const token = getSafeToken();
      if (!token) return;
      const res = await fetch(`https://simigum-production.up.railway.app/api/notifikasi/terbaru?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch {}
  };

  const fetchLiveProfile = async () => {
    try {
      const token = getSafeToken();
      if (!token) return;
      const res = await fetch('https://simigum-production.up.railway.app/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveProfile({
          namaLengkap: data.namaLengkap || data.name || '',
          fotoProfil: data.fotoProfil || ''
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifikasi();
    fetchLiveProfile();
    const interval = setInterval(fetchNotifikasi, 10_000);
    return () => clearInterval(interval);
  }, [currentPage]);

  const possibleNames = [(user?.name || '').toLowerCase(), (user?.namaLengkap || '').toLowerCase(), (user?.username || '').toLowerCase(), (liveProfile.namaLengkap || '').toLowerCase()].filter(Boolean);
  
  const displayNotifs = notifications.filter(n => {
    const pesan = n.pesan.toLowerCase();
    if (possibleNames.some(name => name && pesan.includes(name))) return false;
    const isAdminUser = user?.role?.toLowerCase() === 'admin';
    const isAdminMsg = pesan.includes('admin');
    const isPetugasMsg = pesan.includes('petugas');
    if (isAdminUser && isAdminMsg && !isPetugasMsg) return false;
    if (!isAdminUser && isPetugasMsg && !isAdminMsg) return false;
    return true;
  });

  const unreadCount = displayNotifs.filter(n => n.id > lastReadId).length;
  
  const markAsRead = () => {
    if (displayNotifs.length > 0) {
      const maxId = Math.max(...displayNotifs.map(n => n.id));
      localStorage.setItem(`notif_read_${user?.username}`, maxId.toString());
      setLastReadId(maxId);
    }
  };

  const deleteNotifikasi = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const token = getSafeToken();
      if (!token) return;
      await fetch(`https://simigum-production.up.railway.app/api/notifikasi/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const getRoleLabel = (roleStr?: string) => {
    if (!roleStr) return '';
    const u = roleStr.toUpperCase();
    if (u === 'ADMIN') return 'Administrator';
    if (u === 'PETUGAS_GUDANG') return 'Petugas Gudang';
    return roleStr.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const nav = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const NavItem = ({ page, icon, label }: { page: string; icon: React.ReactNode; label: string; }) => {
    const active = currentPage === page;
    return (
      <button 
        onClick={() => nav(page)} 
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-150 group border
          ${active 
            ? 'bg-white/5 border-white/20 text-white shadow-sm' 
            : 'border-transparent text-[#eafffc] hover:bg-white/1 hover:text-white'}`}
      >
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
          ${active ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/15'}`}>
          <span className="[&>svg]:w-[14px] [&>svg]:h-[14px]">{icon}</span>
        </span>
        {label}
      </button>
    );
  };

  const SectionLabel = ({ label }: { label: string; }) => (
    <p className="text-[9px] font-bold text-[#378d80] uppercase tracking-widest px-2.5 pt-3 pb-1">{label}</p>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
          <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-white font-extrabold text-[14px] tracking-wider">SIMIGUM</span>
      </div>

      <nav className="flex-1 px-2 overflow-y-auto space-y-0.5 custom-scrollbar">
        <SectionLabel label="Navigation" />
        <NavItem page="dashboard" icon={<LayoutDashboard />} label="Dashboard" />
        <NavItem page="data-barang" icon={<Package />} label="Data Barang" />
        <NavItem page="scan-barang" icon={<Scan />} label="Scan Barang" />

        <SectionLabel label="Transaksi" />
        <button 
          onClick={() => setTransaksiOpen(!transaksiOpen)} 
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[12px] font-medium text-[#94f8eb] hover:bg-white/5 hover:text-white transition-all duration-150 border border-transparent"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <History className="w-[14px] h-[14px]" />
            </span>
            Semua Transaksi
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-[#3d7068] transition-transform duration-200 ${transaksiOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {transaksiOpen && (
          <div className="ml-2.5 pl-2.5 border-l border-white/10 space-y-0.5">
            <NavItem page="barang-masuk" icon={<ArrowDownCircle />} label="Barang Masuk" />
            <NavItem page="barang-keluar" icon={<ArrowUpCircle />} label="Barang Keluar" />
            <NavItem page="riwayat" icon={<History />} label="Riwayat" />
          </div>
        )}

        {isAdmin && (
          <>
            <SectionLabel label="Admin" />
            <NavItem page="laporan" icon={<FileText />} label="Laporan" />
            <NavItem page="kelola-user" icon={<Users />} label="Kelola User" />
          </>
        )}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/8 mt-1">
        <p className="text-[9px] font-bold text-[#3d7068] uppercase tracking-widest px-1 mb-1.5">User Account</p>
        <button onClick={() => nav('profil')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-all duration-150">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-emerald-800 border border-emerald-600/50 flex items-center justify-center">
            {liveProfile.fotoProfil ? <img src={liveProfile.fotoProfil} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-emerald-300" />}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[11px] font-semibold text-white leading-tight truncate">
              {liveProfile.namaLengkap || user?.name || user?.namaLengkap || 'Pengguna'}
            </p>
            <p className="text-[9px] text-[#3d7068] leading-tight truncate">#{user?.username || 'user'}</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0f2a1d] dark:bg-[#091a14] p-3">
      <aside className="hidden lg:flex flex-col flex-shrink-0 w-[200px] h-full">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 rounded-3xl shadow-2xl overflow-hidden bg-gradient-to-br from-white via-[#f4fbf9] to-[#d9faf0] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <header className="flex-shrink-0 h-[62px] px-6 flex items-center justify-between bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border-b border-white/50 dark:border-slate-800/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[16px] font-bold text-gray-800 dark:text-white leading-tight">{meta.title}</h1>
              <p className="text-[11px] text-gray-400 dark:text-[#3d7068] leading-tight hidden sm:block">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{today}</span>
            </div>

            <button onClick={toggle} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>

            <button ref={bellBtnRef} onClick={e => {
              e.stopPropagation();
              if (!notifOpen) {
                fetchNotifikasi();
                if (unreadCount > 0) markAsRead();
              }
              setNotifOpen(v => !v);
              setProfileOpen(false);
            }} className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <Bell className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {unreadCount}
                </span>}
            </button>

            <PortalDropdown anchorRef={bellBtnRef} panelRef={notifPanelRef} open={notifOpen}>
              <div className="w-72 bg-white dark:bg-[#0f2922] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/70 dark:bg-white/5">
                  <span className="text-[12px] font-semibold text-gray-700 dark:text-white">Aktivitas Terbaru</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                  {displayNotifs.length > 0 ? displayNotifs.map(notif => (
                    <div key={notif.id} className={`flex items-start gap-2 px-4 py-3 ${notif.id <= lastReadId ? '' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-gray-800 dark:text-gray-200 leading-snug">{notif.pesan}</p>
                        <div className="flex items-center gap-1 mt-1 text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px]">{formatTime(notif.waktu)}</span>
                        </div>
                      </div>
                      <button onClick={e => deleteNotifikasi(e, notif.id)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )) : (
                    <div className="px-4 py-8 text-center flex flex-col items-center gap-2 text-gray-400">
                      <Bell className="w-7 h-7 text-gray-200 dark:text-gray-700" />
                      <p className="text-[12px]">Belum ada aktivitas baru.</p>
                    </div>
                  )}
                </div>
              </div>
            </PortalDropdown>

            <button ref={profileBtnRef} onClick={e => {
              e.stopPropagation();
              setProfileOpen(v => !v);
              setNotifOpen(false);
            }} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center">
                {liveProfile.fotoProfil ? <img src={liveProfile.fotoProfil} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-emerald-700" />}
              </div>
              <span className="hidden sm:block text-[12px] font-semibold text-gray-700 dark:text-white">
                {liveProfile.namaLengkap || user?.name || 'Pengguna'}
              </span>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            <PortalDropdown anchorRef={profileBtnRef} panelRef={profilePanelRef} open={profileOpen}>
              <div className="w-48 bg-white dark:bg-[#0f2922] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                    {liveProfile.namaLengkap || user?.name || 'Pengguna'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-[#3d7068] truncate">{getRoleLabel(user?.role)}</p>
                </div>
                <button onClick={() => {
                  nav('profil');
                  setProfileOpen(false);
                }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Profil Saya
                </button>
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </PortalDropdown>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 bg-transparent custom-scrollbar">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[210px] h-full bg-[#0d2922] shadow-2xl flex flex-col z-10">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </div>
  );
}