import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanLine, Leaf, BarChart2, FileClock, PlusCircle, User, Settings, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner'; // Pastikan komponen ini ada

const DashboardPage = () => {
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(user.fullName || 'Pengguna');
    }

    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('/api/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal memuat statistik.');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Memuat Statistik..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertTriangle className="w-14 h-14 text-red-500 mb-4" />
        <h3 className="text-2xl font-semibold text-red-600 mb-2">Terjadi Kesalahan</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">
          Selamat Datang, {userName}!
        </h2>
        <p className="text-gray-600">Ringkasan aktivitas CornLeaf AI Anda.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card Statistik */}
        <div className="bg-white rounded-xl shadow p-6 flex items-center space-x-4">
          <ScanLine size={40} className="text-emerald-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-700">Total Pindai</h3>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalScans.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-center space-x-4">
          <Leaf size={40} className="text-green-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-700">Penyakit Terdeteksi</h3>
            <p className="text-2xl font-semibold text-gray-900">{stats.diseasesDetected.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-center space-x-4">
          <BarChart2 size={40} className="text-teal-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-700">Akurasi Rata-rata</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.totalScans > 0 ? `${(stats.averageAccuracy * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-center space-x-4">
          <FileClock size={40} className="text-green-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-700">Pindai Bulan Ini</h3>
            <p className="text-2xl font-semibold text-gray-900">{stats.scansThisMonth.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Aksi Cepat</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Link
            to="/cornLeafScanner"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition shadow"
          >
            <PlusCircle size={28} />
            <span className="font-medium">Mulai Pindai Baru</span>
          </Link>
          <Link
            to="/riwayat"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition shadow"
          >
            <FileClock size={28} />
            <span className="font-medium">Lihat Riwayat</span>
          </Link>
          <Link
            to="/team"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition shadow"
          >
            <User size={28} />
            <span className="font-medium">Profil Tim</span>
          </Link>
          <Link
            to="/about"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition shadow"
          >
            <Settings size={28} />
            <span className="font-medium">Tentang Aplikasi</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
