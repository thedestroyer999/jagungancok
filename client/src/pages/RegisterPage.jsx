import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Leaf } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Tambah loading state

  const { fullName, email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registrasi gagal');

      setMessage(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white overflow-hidden px-4">
      {/* Dekorasi daun */}
      <div className="absolute top-16 left-12 animate-bounce delay-100">
        <Leaf className="w-8 h-8 text-green-400 opacity-50" />
      </div>
      <div className="absolute bottom-16 right-20 animate-bounce delay-300">
        <Leaf className="w-7 h-7 text-emerald-400 opacity-40" />
      </div>

      {/* Geometrik latar */}
      <div className="absolute top-36 left-36 w-28 h-28 bg-emerald-200 rounded-full opacity-30 animate-pulse blur-lg" />

      {/* Konten */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 z-10">
        <form onSubmit={onSubmit} className="space-y-7">
          <div>
            <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-2">
              Buat Akun Baru
            </h2>
            <p className="text-center text-gray-600">
              Isi formulir di bawah untuk mendaftar.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
            <input
              type="text"
              id="fullName"
              placeholder="Nama lengkap Anda"
              value={fullName}
              onChange={onChange}
              required
              className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              placeholder="contoh@email.com"
              value={email}
              onChange={onChange}
              required
              className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Kata Sandi</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={onChange}
              required
              minLength={6}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {message && (
            <p className={`text-center text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <UserPlus size={20} />
            <span>{isLoading ? 'Memproses...' : 'Daftar'}</span>
          </button>

          <p className="text-center text-gray-700">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-emerald-600 hover:underline font-semibold">
              Login di sini
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
