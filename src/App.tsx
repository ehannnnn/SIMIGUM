import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataBarang from './pages/DataBarang';
import BarangMasuk from './pages/BarangMasuk';
import BarangKeluar from './pages/BarangKeluar';
import RiwayatTransaksi from './pages/RiwayatTransaksi';
import Laporan from './pages/Laporan';
import KelolaUser from './pages/KelolaUser';
import ScanBarang from './pages/ScanBarang';
import Profil from './pages/profile';
function AppContent() {
  const {
    isAuthenticated,
    user
  } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const navigate = (page: string) => {
    if ((page === 'laporan' || page === 'kelola-user') && !isAdmin) return;
    setCurrentPage(page);
  };
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'data-barang':
        return <DataBarang />;
      case 'scan-barang':
        return <ScanBarang />;
      case 'barang-masuk':
        return <BarangMasuk />;
      case 'barang-keluar':
        return <BarangKeluar />;
      case 'riwayat':
        return <RiwayatTransaksi />;
      case 'laporan':
        return isAdmin ? <Laporan /> : <Dashboard />;
      case 'kelola-user':
        return isAdmin ? <KelolaUser /> : <Dashboard />;
      case 'profil':
        return <Profil />;
      default:
        return <Dashboard />;
    }
  };
  const AuthenticatedView = <Layout currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>;
  return <Routes>
      {}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />


      {}
      <Route path="/" element={isAuthenticated ? AuthenticatedView : <Navigate to="/login" replace />} />

      {}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
}
export default function App() {
  return <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>;
}