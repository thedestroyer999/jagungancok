import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      setIsError(false);
      setMessage(data.message);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center bg-white overflow-hidden">
      {/* Background decorative shapes (mirip home) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 animate-bounce delay-100">
          <div className="w-8 h-8 bg-gradient-to-br from-green-300 to-emerald-300 rounded-full opacity-60 blur-sm"></div>
        </div>
        <div className="absolute top-40 right-20 animate-bounce delay-300">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-300 to-green-300 rounded-full opacity-40 blur-sm"></div>
        </div>
        <div className="absolute top-32 right-32 w-20 h-20 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full opacity-30 animate-pulse"></div>
      </div>

      <div className="relative z-10 bg-white shadow-xl rounded-3xl max-w-md w-full p-10 sm:p-14">
        <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Selamat Datang Kembali!
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Silakan masuk untuk melanjutkan.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
              Alamat Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="contoh@email.com"
              value={email}
              onChange={onChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-gray-700 font-semibold">
                Kata Sandi
              </label>
              <Link to="/forgot-password" className="text-green-600 hover:text-emerald-600 text-sm font-medium">
                Lupa Kata Sandi?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={onChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          {message && (
            <p className={`text-center text-sm ${isError ? 'text-red-600' : 'text-green-600'} font-semibold`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition duration-300 disabled:opacity-50"
          >
            <LogIn size={20} />
            <span>{isLoading ? 'Memproses...' : 'Login'}</span>
          </button>
        </form>

        <p className="text-center text-gray-700 mt-8">
          Belum punya akun?{' '}
          <Link to="/register" className="text-green-600 font-semibold hover:text-emerald-600">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
