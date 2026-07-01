import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Search, X, Eye, EyeOff, Shield, UserCheck, Users, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function KelolaUser() {
  const {
    user
  } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('SEMUA');
  const [statusFilter, setStatusFilter] = useState('SEMUA');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUser: 0,
    totalAdmin: 0,
    totalPetugas: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getSafeToken = () => {
    let token = localStorage.getItem('token');
    if (!token && user && (user as any).token) token = (user as any).token;
    if (token) token = token.replace(/"/g, '');
    return token;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getSafeToken();
        if (!token) throw new Error('Token tidak ditemukan. Silakan login ulang.');
        const response = await fetch(`https://simigum-production.up.railway.app/api/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`Gagal memuat data pengguna (Error: ${response.status})`);
        const resData = await response.json();
        let dataList: any[] = [];
        if (Array.isArray(resData)) {
          dataList = resData;
        } else if (resData && Array.isArray(resData.list)) {
          dataList = resData.list;
        } else if (resData && Array.isArray(resData.content)) {
          dataList = resData.content;
        } else if (resData && typeof resData === 'object') {
          const keyWithArray = Object.keys(resData).find(key => Array.isArray(resData[key]));
          if (keyWithArray) dataList = resData[keyWithArray];
        }
        setUsers(dataList);
        setStats({
          totalUser: dataList.length,
          totalAdmin: dataList.filter((u: any) => String(u.role).toUpperCase() === 'ADMIN').length,
          totalPetugas: dataList.filter((u: any) => String(u.role).toUpperCase() !== 'ADMIN').length
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [refreshTrigger, user]);

  const filteredUsers = users.filter((u: any) => {
    const searchTerm = search.toLowerCase();
    const nama = (u.namaLengkap || u.name || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const matchSearch = search === '' || nama.includes(searchTerm) || username.includes(searchTerm);
    const userRole = String(u.role).toUpperCase();
    const matchRole = roleFilter === 'SEMUA' || userRole === roleFilter;
    const isAktif = u.verified === true || u.status === 'aktif';
    let matchStatus = true;
    if (statusFilter === 'AKTIF') matchStatus = isAktif;
    if (statusFilter === 'NONAKTIF') matchStatus = !isAktif;
    return matchSearch && matchRole && matchStatus;
  });

  const handleToggleStatus = async (item: any) => {
    try {
      const token = getSafeToken();
      const isCurrentlyVerified = item.verified === true || item.status === 'aktif';
      const updatedStatus = !isCurrentlyVerified;
      const payload = {
        ...item,
        verified: updatedStatus
      };
      const response = await fetch(`https://simigum-production.up.railway.app/api/user/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Gagal memperbarui status user');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteId) return;
    try {
      const token = getSafeToken();
      const response = await fetch(`https://simigum-production.up.railway.app/api/user/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Gagal menghapus data pengguna');
      setDeleteId(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && users.length === 0) {
    return <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
      </div>;
  }

  return <div className="w-full h-full">
      <div className="space-y-3 max-w-[1600px] mx-auto font-sans text-slate-800 dark:text-slate-200 p-2 md:px-6 md:pt-4 md:pb-6">
        
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-3 shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input type="text" placeholder="Cari nama atau username..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-300 dark:focus:border-slate-600 dark:text-slate-200" />
            </div>
            
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full sm:w-40 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
              <option value="SEMUA">Semua Role</option>
              <option value="ADMIN">Admin</option>
              <option value="PETUGAS_GUDANG">Petugas Gudang</option>
            </select>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-40 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
              <option value="SEMUA">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="NONAKTIF">Nonaktif</option>
            </select>
          </div>

          <button onClick={() => {
          setEditItem(null);
          setShowModal(true);
        }} className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-[#0f4d2f] hover:bg-[#1f6744] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Tambah User
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          
          <div className="lg:col-span-9 space-y-3">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="TOTAL USER" val={stats.totalUser} icon={<Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} iconBg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50" trend="Aktif" trendLabel="Di website" />
              <StatCard label="ADMIN" val={stats.totalAdmin} icon={<Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} iconBg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50" trend="Akses" trendLabel="Level Tertinggi" />
              <StatCard label="PETUGAS GUDANG" val={stats.totalPetugas} icon={<UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} iconBg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50" trend="Akses" trendLabel="Operasional" />
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl p-3 text-xs font-medium flex items-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>}

            <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Daftar User</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                      {['No', 'Nama Lengkap', 'Username', 'Role', 'Status', 'Dibuat Pada', 'Aksi'].map(h => <th key={h} className="py-2.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {filteredUsers.length > 0 ? filteredUsers.map((u, i) => {
                    const isAktif = u.verified === true || u.status === 'aktif';
                    return <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-medium text-xs">{i + 1}</td>
                          <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200">{u.namaLengkap || u.name || '-'}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{u.username}</td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {String(u.role).toUpperCase() === 'ADMIN' ? 'Admin' : 'Petugas Gudang'}
                          </td>
                          <td className="py-3 px-4">
                            <button onClick={() => handleToggleStatus(u)} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${isAktif ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400'}`}>
                              {isAktif ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => {
                            setEditItem(u);
                            setShowModal(true);
                          }} className="p-1 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" title="Edit User">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(u.id)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" title="Hapus User">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>;
                  }) : <tr>
                        <td colSpan={7} className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                          {loading ? 'Memuat data...' : 'Tidak ada data pengguna yang cocok dengan filter.'}
                        </td>
                      </tr>}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div className="lg:col-span-3 bg-white dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Aksi Cepat</h3>
            
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-normal">
                Kelola pengguna sistem dengan mudah dan aman.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <SidebarItem icon={<Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Tambah User" desc="Buat akun user baru dan atur perannya." onClick={() => {
              setEditItem(null);
              setShowModal(true);
            }} />
              <SidebarItem icon={<Edit2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Edit User" desc="Panduan: Klik ikon PENSIL pada baris user di tabel samping." onClick={() => alert("INFO: Untuk mengedit, silakan temukan nama pengguna di tabel samping, lalu klik ikon Pensil di kolom Aksi.")} />
              <SidebarItem icon={<Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />} title="Hapus User" desc="Panduan: Klik ikon TONG SAMPAH pada tabel samping." onClick={() => alert("INFO: Untuk menghapus, silakan temukan nama pengguna di tabel samping, lalu klik ikon Tempat Sampah di kolom Aksi.")} />
            </div>
          </div>

        </div>

      </div>

      {showModal && <UserModal item={editItem} userContext={user} onClose={() => setShowModal(false)} onSave={async (formData: any) => {
      try {
        const token = getSafeToken();
        const url = editItem ? `https://simigum-production.up.railway.app/api/user/${editItem.id}` : 'https://simigum-production.up.railway.app/api/user';
        const method = editItem ? 'PUT' : 'POST';
        const payload = {
          namaLengkap: formData.name,
          username: formData.username,
          email: formData.email,
          role: String(formData.role).toUpperCase(),
          verified: formData.status === 'aktif'
        };
        if (formData.password) {
          (payload as any).password = formData.password;
        }
        const response = await fetch(url, {
          method: method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Gagal menyimpan data pengguna ke server');
        setShowModal(false);
        setRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        alert(err.message);
      }
    }} />}

      {deleteId && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center mb-1">Hapus Pengguna?</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-4">Data pengguna ini akan dihapus secara permanen dari database.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">Batal</button>
              <button onClick={handleDeleteUser} className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors">Hapus</button>
            </div>
          </div>
        </div>}
    </div>;
}

function StatCard({
  label,
  val,
  icon,
  iconBg,
  trend,
  trendLabel
}: any) {
  return <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-1">{val}</p>
          <p className="text-[9px] font-semibold text-emerald-500 dark:text-emerald-400">
            • {trend} <span className="text-slate-400 dark:text-slate-500 font-medium ml-0.5">{trendLabel}</span>
          </p>
        </div>
      </div>
    </div>;
}

function SidebarItem({
  icon,
  title,
  desc,
  onClick
}: any) {
  return <div onClick={onClick} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-100 dark:hover:border-white/10 rounded-xl transition-all cursor-pointer group">
      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900/50 group-hover:bg-white group-hover:dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-100 dark:border-slate-700">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">{title}</h4>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-normal">{desc}</p>
      </div>
    </div>;
}

function UserModal({
  item,
  onClose,
  onSave
}: any) {
  const isMasterAccount = item?.username === 'gumsimi2';
  const [form, setForm] = useState({
    name: item?.namaLengkap || item?.name || '',
    username: item?.username || '',
    email: item?.email || '',
    role: item?.role ? String(item.role).toUpperCase() : 'PETUGAS_GUDANG',
    status: item?.verified === true || item?.status === 'aktif' ? 'aktif' : 'nonaktif',
    password: ''
  });
  const [showPwd, setShowPwd] = useState(false);
  const inputCls = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-300 dark:focus:border-slate-600 text-slate-700 dark:text-slate-200";
  const labelCls = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1";
  
  return <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{item ? 'Edit Informasi User' : 'Tambah Pengguna Baru'}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className={labelCls}>Nama Lengkap</label><input value={form.name} onChange={e => setForm({
            ...form,
            name: e.target.value
          })} className={inputCls} placeholder="Contoh: Admin Utama" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Username</label>
              <input value={form.username} onChange={e => setForm({
              ...form,
              username: e.target.value
            })} disabled={isMasterAccount} className={`${inputCls} ${isMasterAccount ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700' : ''}`} placeholder="username" />
              {isMasterAccount && <p className="text-[9px] text-rose-500 dark:text-rose-400 mt-1 font-medium leading-tight">
                  *Username master dikunci
                </p>}
            </div>
            <div><label className={labelCls}>Peran Sistem</label>
              <select value={form.role} onChange={e => setForm({
              ...form,
              role: e.target.value
            })} className={inputCls}>
                <option value="ADMIN">Admin</option>
                <option value="PETUGAS_GUDANG">Petugas Gudang</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e => setForm({
            ...form,
            email: e.target.value
          })} className={inputCls} placeholder="name@company.com" /></div>
          <div><label className={labelCls}>{item ? 'Password Baru (Kosongkan jika tetap)' : 'Password Akun'}</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({
              ...form,
              password: e.target.value
            })} className={`${inputCls} pr-9`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2 text-slate-400 dark:text-slate-500">
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div><label className={labelCls}>Status Aktivasi</label>
            <select value={form.status} onChange={e => setForm({
            ...form,
            status: e.target.value
          })} className={inputCls}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">Batal</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 bg-[#0f4d2f] hover:bg-[#1f6744] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors">{item ? 'Simpan' : 'Tambah'}</button>
        </div>
      </div>
    </div>;
}