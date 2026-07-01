import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, User, Lock, Warehouse, Sun, Moon, Mail, Shield, ChevronDown, UserCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
export default function Login() {
  const {
    login
  } = useAuth();
  const {
    theme,
    toggle
  } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordInput, setForgotPasswordInput] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpPurpose, setOtpPurpose] = useState<'LOGIN' | 'RESET_PASSWORD'>('LOGIN');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState('');
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOTP && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOTP, timeLeft]);
  const getMaskedEmail = () => {
    const realEmail = tempUserData?.email;
    if (!realEmail || !realEmail.includes('@')) {
      return 'email terdaftar Anda';
    }
    const [name, domain] = realEmail.split('@');
    const visiblePart = name.length > 3 ? name.substring(0, 3) : name.charAt(0);
    return `${visiblePart}***@${domain}`;
  };
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOtpPurpose('LOGIN');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          role
        })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        if (data.requireOtp === false) {
          login(data.token, data.username, data.namaLengkap, data.role);
          const stored = localStorage.getItem('inventaris_user');
          const currentStoredData = stored ? JSON.parse(stored) : {};
          localStorage.setItem('inventaris_user', JSON.stringify({
            ...currentStoredData,
            id: data.id,
            token: data.token,
            username: data.username,
            role: data.role
          }));
        } else {
          setTempUserData(data);
          setShowOTP(true);
          setTimeLeft(120);
        }
      } else {
        setError(data.message || 'Username, password, atau peran sistem salah.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server database.');
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPasswordClick = () => {
    setError('');
    setForgotPasswordInput('');
    setShowForgotPasswordModal(true);
  };
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordInput) {
      setError('Silakan masukkan Username Anda.');
      return;
    }
    setLoading(true);
    setError('');
    setOtpPurpose('RESET_PASSWORD');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: forgotPasswordInput
        })
      });
      const data = await response.json();
      if (response.ok && data.status !== 'error') {
        setTempUserData(data);
        setShowForgotPasswordModal(false);
        setShowOTP(true);
        setTimeLeft(120);
      } else {
        setError(data.message || 'Username tidak ditemukan.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server untuk reset password.');
    } finally {
      setLoading(false);
    }
  };
  const handleResendOTP = async () => {
    setTimeLeft(120);
    setError('');
    try {
      const endpoint = otpPurpose === 'LOGIN' ? `${API_URL}/auth/resend-otp` : `${API_URL}/auth/resend-forgot-otp`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: tempUserData?.email || forgotPasswordInput || username
        })
      });
      const data = await response.json();
      if (data.status !== 'success') setError(data.message || 'Gagal mengirim ulang OTP.');
    } catch (err) {
      setError('Gagal terhubung ke server untuk kirim ulang OTP.');
    }
  };
  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1]?.focus();
    }
  };
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) return setError('Harap masukkan 6 digit kode OTP secara lengkap.');
    setLoading(true);
    setError('');
    try {
      const endpoint = otpPurpose === 'LOGIN' ? `${API_URL}/auth/verify-otp` : `${API_URL}/auth/verify-forgot-otp`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: tempUserData?.email || forgotPasswordInput || username,
          otp: otpCode
        })
      });
      const data = await response.json();
      if (data.status === 'success' || response.ok) {
        if (otpPurpose === 'LOGIN') {
          login(tempUserData.token, tempUserData.username, tempUserData.namaLengkap, tempUserData.role);
          const stored = localStorage.getItem('inventaris_user');
          const currentStoredData = stored ? JSON.parse(stored) : {};
          localStorage.setItem('inventaris_user', JSON.stringify({
            ...currentStoredData,
            id: tempUserData.id,
            token: tempUserData.token,
            username: tempUserData.username,
            role: tempUserData.role
          }));
        } else {
          setVerifiedOtp(otpCode);
          setShowOTP(false);
          setOtp(['', '', '', '', '', '']);
          setShowResetPassword(true);
        }
      } else {
        setError(data.message || 'Verifikasi gagal. OTP tidak sesuai.');
      }
    } catch (err) {
      setError('Gagal memverifikasi OTP.');
    } finally {
      setLoading(false);
    }
  };
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: tempUserData?.username || forgotPasswordInput || username,
          otp: verifiedOtp,
          newPassword: newPassword
        })
      });
      if (response.ok) {
        alert('Password berhasil diubah! Silakan login menggunakan password baru Anda.');
        setShowResetPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setPassword('');
        setUsername('');
      } else {
        const data = await response.json();
        setError(data.message || 'Gagal mengubah password.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server database.');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {}
      <button onClick={toggle} className="fixed top-4 right-4 z-50 w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
      </button>

      {}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex-col items-center justify-between p-10 relative overflow-hidden transition-colors duration-200">
        <div className="relative z-10 flex items-center gap-3 self-start mb-8">
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
            <img src="/logo.svg" alt="Logo SIMIGUM" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-green-900 dark:text-white font-extrabold text-2xl tracking-wider leading-tight">
              SIMIGUM
            </p>
            <p className="text-green-700 dark:text-green-400 font-semibold text-[11px] leading-tight mt-0.5">
              Sistem Inventaris Gudang UMKM
            </p>
          </div>
        </div>

        <div className="relative z-10 text-center">
          <img src="/login2.png" alt="Warehouse" className="w-72 h-52 object-cover rounded-2xl shadow-xl mx-auto mb-8" />
          <h2 className="text-2xl font-bold text-green-900 dark:text-white mb-3">Selamat Datang</h2>
          <p className="text-green-800 dark:text-green-300 font-semibold mb-2">Sistem Informasi Inventaris Gudang</p>
          <p className="text-green-700 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
            Kelola data barang, stok, and transaksi inventaris gudang secara mudah, akurat, dan terintegrasi.
          </p>
        </div>

        <div className="relative z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-5 border border-green-200 dark:border-gray-700 max-w-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Warehouse className="w-4 h-4 text-white" />
            </div>
            <p className="text-green-800 dark:text-gray-300 text-sm leading-relaxed">
              Kelola inventaris gudang lebih mudah dan efisien. Pastikan setiap barang tercatat dengan akurat.
            </p>
          </div>
        </div>
      </div>

      {}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative bg-cover bg-center" style={{
      backgroundImage: "url('/login.png')"
    }}>
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 pointer-events-none"></div>

        {}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 lg:hidden">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img src="/logo.svg" alt="Logo SIMIGUM" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-white font-extrabold text-base tracking-wider leading-tight drop-shadow-md">SIMIGUM</p>
            <p className="text-green-300 font-semibold text-[9px] leading-tight mt-0.5 drop-shadow-md">Inventaris Gudang UMKM</p>
          </div>
        </div>

        <div className="w-full max-w-md relative z-10 mt-10 lg:mt-0">
          <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] p-6 sm:p-8 border border-white/30 dark:border-gray-700/30 transition-colors duration-200">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white drop-shadow-md">Masuk</h1>
              <p className="text-gray-800 dark:text-gray-200 mt-1 text-sm font-semibold drop-shadow-md">Silakan masuk ke akun Anda</p>
            </div>

            {error && !showForgotPasswordModal && !showOTP && !showResetPassword && <div className="bg-red-50/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
                {error}
              </div>}

            <form onSubmit={handleInitialSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 drop-shadow-sm">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 dark:text-gray-300" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Masukkan username Anda" className="w-full pl-10 pr-4 py-3 border border-white/20 dark:border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-all bg-white/20 dark:bg-gray-800/30 focus:bg-white/40 dark:focus:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-700 dark:placeholder-gray-400 backdrop-blur-sm" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 drop-shadow-sm">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 dark:text-gray-300" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password Anda" className="w-full pl-10 pr-11 py-3 border border-white/20 dark:border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-all bg-white/20 dark:bg-gray-800/30 focus:bg-white/40 dark:focus:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-700 dark:placeholder-gray-400 backdrop-blur-sm" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-200">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div ref={dropdownRef}>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 drop-shadow-sm">Peran Sistem</label>
                <div className="relative">
                  <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`w-full pl-10 pr-4 py-3 border ${isDropdownOpen ? 'border-green-500 ring-2 ring-green-500/50' : 'border-white/20 dark:border-gray-600/30'} rounded-xl text-sm transition-all bg-white/20 dark:bg-gray-800/30 hover:bg-white/40 dark:hover:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm flex items-center justify-between cursor-pointer`}>
                    <div className="flex items-center gap-2">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 dark:text-gray-300" />
                      <span className="font-medium">{role === 'ADMIN' ? 'Administrator' : 'Petugas Gudang'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isDropdownOpen && <div className="absolute top-full left-0 w-full mt-2 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white/50 dark:border-gray-600/50 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] overflow-hidden z-50">
                      <div onClick={() => {
                    setRole('ADMIN');
                    setIsDropdownOpen(false);
                  }} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${role === 'ADMIN' ? 'bg-green-100/60 dark:bg-gray-800' : 'hover:bg-white/50 dark:hover:bg-gray-800/60'}`}>
                        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/40 dark:border-gray-600">
                          <Shield className="w-4 h-4 text-gray-900 dark:text-gray-200" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Administrator</p>
                          <p className="text-[10px] text-gray-700 dark:text-gray-400">Akses penuh kelola pengguna & sistem</p>
                        </div>
                      </div>
                      <div onClick={() => {
                    setRole('PETUGAS_GUDANG');
                    setIsDropdownOpen(false);
                  }} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-t border-white/30 dark:border-gray-700 ${role === 'PETUGAS_GUDANG' ? 'bg-green-100/60 dark:bg-gray-800' : 'hover:bg-white/50 dark:hover:bg-gray-800/60'}`}>
                        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/40 dark:border-gray-600">
                          <UserCheck className="w-4 h-4 text-gray-900 dark:text-gray-200" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Petugas Gudang</p>
                          <p className="text-[10px] text-gray-700 dark:text-gray-400">Manajemen stok & transaksi harian</p>
                        </div>
                      </div>
                    </div>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 accent-green-600 rounded border-white/30" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 drop-shadow-sm">Ingat saya</span>
                </label>
                <button type="button" onClick={handleForgotPasswordClick} className="text-sm text-green-900 dark:text-green-400 font-bold hover:text-green-950 dark:hover:text-green-300 transition-colors drop-shadow-md">
                  Lupa password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-green-700/80 hover:bg-green-800 backdrop-blur-sm disabled:bg-green-400/80 text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm shadow-lg hover:shadow-xl border border-green-600/50 mt-4">
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs font-bold text-gray-900 dark:text-gray-200 drop-shadow-md mt-6">&copy; 2026 Inventaris Gudang</p>
        </div>
      </div>

      {}
      {showForgotPasswordModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border border-gray-100 dark:border-gray-800 transform transition-all relative overflow-hidden mx-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="relative z-10 text-center mb-6">
              <div className="w-14 h-14 bg-green-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-gray-700">
                <User className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Konfirmasi Akun</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 px-2">
                Masukkan Username akun Anda yang ingin diubah kata sandinya.
              </p>
            </div>

            {error && showForgotPasswordModal && <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 mb-4 text-xs font-medium">
                {error}
              </div>}

            <form onSubmit={handleForgotPasswordSubmit} className="relative z-10 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username Akun</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={forgotPasswordInput} onChange={e => setForgotPasswordInput(e.target.value)} placeholder="Masukkan username Anda" className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" required />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" disabled={loading || !forgotPasswordInput} className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
                  {loading ? 'Memproses...' : 'Kirim Kode OTP'}
                </button>
                <button type="button" onClick={() => {
              setShowForgotPasswordModal(false);
              setError('');
            }} className="w-full py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>}

      {}
      {showOTP && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border border-gray-100 dark:border-gray-800 transform transition-all relative overflow-hidden mx-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-gray-700">
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {otpPurpose === 'LOGIN' ? 'Verifikasi Keamanan' : 'Reset Password Akun'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 px-2">
                {otpPurpose === 'LOGIN' ? 'Masukkan 6 digit kode OTP yang telah dikirim ke email:' : 'Masukkan 6 digit kode OTP untuk konfirmasi ganti password ke:'}
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-6 sm:mb-8 px-2 tracking-wide">{getMaskedEmail()}</p>

              {error && showOTP && <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 mb-4 text-xs font-medium">{error}</div>}
            </div>

            <form onSubmit={handleVerifyOTP} className="relative z-10">
              {}
              <div className="flex justify-between gap-1.5 sm:gap-2 mb-6 sm:mb-8">
                {otp.map((digit, index) => <input key={index} ref={el => otpRefs.current[index] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm" />)}
              </div>
              <div className="flex flex-col gap-3">
                <button type="submit" disabled={loading || otp.join('').length !== 6} className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg">
                  {loading ? 'Memverifikasi...' : otpPurpose === 'LOGIN' ? 'Verifikasi Akun' : 'Konfirmasi OTP'}
                </button>
                <button type="button" onClick={() => {
              setShowOTP(false);
              setOtp(['', '', '', '', '', '']);
              setError('');
            }} className="w-full py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Batal
                </button>
              </div>
              <div className="mt-6 text-center">
                {timeLeft > 0 ? <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Kirim ulang kode dalam <span className="font-bold text-green-600 dark:text-green-400">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                  </p> : <button type="button" onClick={handleResendOTP} className="text-sm font-bold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors underline decoration-2 underline-offset-4">
                    Kirim Ulang Kode OTP
                  </button>}
              </div>
            </form>
          </div>
        </div>}

      {}
      {showResetPassword && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border border-gray-100 dark:border-gray-800 transform transition-all relative overflow-hidden mx-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="relative z-10 text-center mb-6">
              <div className="w-14 h-14 bg-green-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-gray-700">
                <KeyRound className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Buat Password Baru</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 px-2">
                Identitas terverifikasi. Silakan masukkan password baru untuk akun Anda.
              </p>
            </div>

            {error && showResetPassword && <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 mb-4 text-xs font-medium">
                {error}
              </div>}

            <form onSubmit={handleResetPasswordSubmit} className="relative z-10 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full pl-10 pr-11 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" required />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Konfirmasi Password Baru</label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showNewPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ketik ulang password baru" className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" required />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" disabled={loading || !newPassword || !confirmPassword} className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
                  {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
                <button type="button" onClick={() => setShowResetPassword(false)} className="w-full py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
}