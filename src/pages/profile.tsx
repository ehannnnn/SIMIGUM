import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ShieldCheck, Lock, CheckCircle2, User, Camera, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profil() {
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState({
    namaLengkap: '',
    username: '',
    email: '',
    noTelepon: '',
    alamat: '',
    fotoProfil: ''
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfPwd, setShowConfPwd] = useState(false);
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  
  const [message, setMessage] = useState({
    type: '',
    text: ''
  });

  const getRoleLabel = (roleStr?: string) => {
    if (!roleStr) return 'Pengguna';
    const upper = roleStr.toUpperCase();
    if (upper === 'ADMIN') return 'Administrator';
    if (upper === 'PETUGAS_GUDANG' || upper === 'PETUGAS') return 'Petugas Gudang';
    return roleStr.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      let token = localStorage.getItem('token');
      if (!token && user && (user as any).token) token = (user as any).token;
      if (!token) return;
      
      const response = await fetch('http://localhost:8080/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          namaLengkap: data.namaLengkap || data.name || '',
          username: data.username || '',
          email: data.email || '',
          noTelepon: data.noTelepon || '',
          alamat: data.alamat || '',
          fotoProfil: data.fotoProfil || ''
        });
        if (data.fotoProfil) setAvatarPreview(data.fotoProfil);
      }
    } catch (error) {
      console.error("Gagal mengambil data profil:", error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Ukuran foto terlalu besar, maksimal 10MB!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        setProfileData({ ...profileData, fotoProfil: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔥 LOGIKA PINTAR: Validasi Email Master Admin vs User Biasa
    // Cek apakah user saat ini adalah master admin "gumsimi2"
    const isMasterAdmin = profileData.username.toLowerCase() === 'gumsimi2';
    
    if (!isMasterAdmin && !profileData.email.trim()) {
      setMessage({ type: 'error', text: 'Email wajib diisi untuk akun Anda!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      return;
    }

    setLoadingProfile(true);
    setMessage({ type: '', text: '' });
    
    try {
      let token = localStorage.getItem('token');
      if (!token && user && (user as any).token) token = (user as any).token;
      
      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memperbarui profil di server');
      }
      
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      return;
    }
    
    setLoadingPassword(true);
    setMessage({ type: '', text: '' });
    
    try {
      let token = localStorage.getItem('token');
      if (!token && user && (user as any).token) token = (user as any).token;
      
      const response = await fetch('http://localhost:8080/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      if (!response.ok) throw new Error('Password saat ini salah atau gagal diubah');
      
      setMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } finally {
      setLoadingPassword(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 text-gray-800 bg-white transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  
 
 const isMasterAdminDisplay = profileData.username.toLowerCase() === 'gumsimi2';

  return (
    <div className="w-full min-h-full bg-slate-50/50 p-6 font-sans relative">
      
      {/* Notifikasi Pop-up */}
      {message.text && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium min-w-[300px] max-w-[400px] transition-all duration-300 bg-white animate-fade-in
          ${message.type === 'success' ? 'border-green-100 text-green-800 shadow-green-100/40' : 'border-red-100 text-red-800 shadow-red-100/40'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <div className="flex-1 leading-snug">{message.text}</div>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-gray-400 hover:text-gray-600 text-xs font-bold ml-1 px-1 py-0.5 rounded transition-colors">
            ✕
          </button>
        </div>
      )}

      <div className="max-w-[1000px] mx-auto space-y-6">
        
        {/* Card Profil Utama */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
          
          {/* Sisi Kiri - Avatar */}
          <div className="w-full md:w-[35%] p-8 border-b md:border-b-0 md:border-r border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Informasi Profil</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              Perbarui informasi profil Anda yang digunakan untuk akun sistem.
            </p>
            
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-full bg-green-50 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-green-700" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium">Ubah Foto</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900">{profileData.namaLengkap || user?.name || 'User'}</h3>
              <p className="text-sm text-gray-500 mb-5">{getRoleLabel(user?.role)}</p>
              
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${user?.role?.toUpperCase() === 'ADMIN' ? 'bg-green-50/80 text-green-700 border-green-100' : 'bg-blue-50/80 text-blue-700 border-blue-100'}`}>
                <ShieldCheck className="w-4 h-4" />
                Akun {getRoleLabel(user?.role)}
              </div>
            </div>
          </div>

          {/* Sisi Kanan - Form Profil */}
          <div className="w-full md:w-[65%] p-8">
            <form onSubmit={handleProfileSubmit} className="flex flex-col h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className={labelClass}>Nama Lengkap</label>
                  <input type="text" className={inputClass} value={profileData.namaLengkap} onChange={e => setProfileData({ ...profileData, namaLengkap: e.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Username</label>
                  <input type="text" className={inputClass} value={profileData.username} required disabled />
                </div>
                <div>
                  {/* 🔥 PERBAIKAN: Input Email melepas atribut 'required' HTML bawaan jika master admin */}
                  <label className={labelClass}>
                    Email {!isMasterAdminDisplay && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="email" 
                    className={inputClass} 
                    value={profileData.email} 
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })} 
                    required={!isMasterAdminDisplay} // Dinamis
                  />
                </div>
                <div>
                  <label className={labelClass}>No. Telepon</label>
                  <input type="text" className={inputClass} value={profileData.noTelepon} onChange={e => setProfileData({ ...profileData, noTelepon: e.target.value })} />
                </div>
              </div>
              
              <div className="mb-8">
                <label className={labelClass}>Alamat</label>
                <textarea rows={3} className={`${inputClass} resize-none`} value={profileData.alamat} onChange={e => setProfileData({ ...profileData, alamat: e.target.value })} />
              </div>

              <div className="mt-auto flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={fetchProfile} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={loadingProfile} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0f4d2f] hover:bg-[#5bb68a] disabled:opacity-70">
                  {loadingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Card Ubah Password */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-[35%] p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Ubah Password</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">Pastikan password Anda kuat dan aman.</p>
            <div className="flex justify-center mt-4 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-60"></div>
                <div className="w-28 h-28 rounded-full bg-green-50 flex items-center justify-center relative border border-green-100">
                  <Lock className="w-12 h-12 text-green-600" />
                  <span className="absolute top-2 right-2 text-green-300 text-xl">✦</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[65%] p-8">
            <form onSubmit={handlePasswordSubmit} className="flex flex-col h-full">
              <div className="space-y-5 mb-5">
                <div>
                  <label className={labelClass}>Password Saat Ini</label>
                  <div className="relative">
                    <input type={showOldPwd ? "text" : "password"} className={inputClass} value={passwordData.oldPassword} onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })} required />
                    <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Password Baru</label>
                  <div className="relative">
                    <input type={showNewPwd ? "text" : "password"} className={inputClass} value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} required minLength={8} />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input type={showConfPwd ? "text" : "password"} className={inputClass} value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required minLength={8} />
                    <button type="button" onClick={() => setShowConfPwd(!showConfPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showConfPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">Reset</button>
                <button type="submit" disabled={loadingPassword} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0f4d2f] hover:bg-[#5bb68a] disabled:opacity-70">
                  {loadingPassword ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}