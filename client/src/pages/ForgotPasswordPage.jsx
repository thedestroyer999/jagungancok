import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Gagal mengirim email pemulihan.');
            setMessage({ type: 'success', text: data.message });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center bg-white overflow-hidden">
            {/* Background decorative shapes (sama seperti login) */}
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
                    Lupa Kata Sandi?
                </h2>
                <p className="text-center text-gray-600 mb-8">
                    Jangan khawatir! Masukkan email Anda di bawah ini.
                </p>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Pesan Error atau Success */}
                    {message.text && (
                        <p className={`flex items-center justify-center gap-2 text-center text-sm font-semibold ${
                            message.type === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            <span>{message.text}</span>
                        </p>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                            Alamat Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            placeholder="contoh@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition duration-300 disabled:opacity-50"
                    >
                        <Mail size={20} />
                        <span>{isLoading ? 'Mengirim...' : 'Kirim Link Pemulihan'}</span>
                    </button>
                </form>

                <p className="text-center text-gray-700 mt-8">
                    Ingat kata sandi Anda?{' '}
                    <Link to="/login" className="text-green-600 font-semibold hover:text-emerald-600">
                        Login di sini
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;