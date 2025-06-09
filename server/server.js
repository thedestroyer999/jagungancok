// server.js

// --- Impor Modul ---
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto =require('crypto');
const rateLimit = require('express-rate-limit'); // BARU: Untuk keamanan

const app = express();

// --- Middleware Global ---
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit untuk menerima gambar Base64

// --- Konstanta & Konfigurasi ---
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// DIUBAH: Validasi variabel lingkungan yang krusial saat startup
if (!JWT_SECRET || !process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.error('FATAL ERROR: Environment variables (JWT_SECRET, DB_HOST, DB_USER, DB_NAME) are not defined.');
    process.exit(1);
}

// --- Keamanan: Rate Limiter ---
// BARU: Melindungi dari serangan brute force pada endpoint otentikasi
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 menit
	max: 10, // Batasi setiap IP hingga 10 permintaan per 'window'
	standardHeaders: true,
	legacyHeaders: false,
    message: { message: 'Terlalu banyak percobaan, silakan coba lagi setelah 15 menit.' }
});

// --- Koneksi Database ---
// DIUBAH: Menggunakan Pool Koneksi untuk efisiensi dan ketahanan
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const db = mysql.createPool(dbConfig);

// Verifikasi koneksi pool (opsional, tapi bagus untuk pengecekan awal)
db.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database pool.');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.stack);
    process.exit(1);
  });


// --- Konfigurasi Nodemailer ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP configuration error. Emails may not be sent.', error);
    } else {
        console.log('SMTP Server is ready to send emails.');
    }
});


// --- Helper & Middleware ---

// BARU: Fungsi helper untuk membuat token dan payload respons
const generateAuthResponse = (user) => {
    const payload = {
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name
        }
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user: payload.user };
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Sesi telah berakhir, silakan login kembali.' });
        return res.status(403).json({ message: 'Token tidak valid.' });
    }
};

// --- Rute API ---

// Fungsi wrapper untuk menangani error async (mengurangi blok try-catch)
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// -- Rute Autentikasi --
app.post('/api/register', asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password || password.length < 6) {
        return res.status(400).json({ message: 'Harap isi semua kolom. Kata sandi minimal 6 karakter.' });
    }

    const [users] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
        return res.status(409).json({ message: 'Email ini sudah terdaftar.' }); // 409 Conflict lebih sesuai
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)', [fullName, email, hashedPassword]);
    res.status(201).json({ message: 'Registrasi berhasil! Silakan login.' });
}));

app.post('/api/login', authLimiter, asyncHandler(async (req, res) => { // DITAMBAHKAN: authLimiter
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Harap masukkan email dan password.' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
        return res.status(401).json({ message: 'Email atau kata sandi salah.' }); // 401 Unauthorized
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Email atau kata sandi salah.' }); // 401 Unauthorized
    }

    const authResponse = generateAuthResponse(user); // DIUBAH: Menggunakan helper
    res.json({ message: 'Login berhasil!', ...authResponse });
}));

// -- Rute Lupa & Reset Kata Sandi --
app.post('/api/forgot-password', authLimiter, asyncHandler(async (req, res) => { // DITAMBAHKAN: authLimiter
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email harus diisi.' });

    // Catatan: Selalu kirim respons sukses untuk mencegah user enumeration attack (sudah benar!)
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryDate = new Date(Date.now() + 3600000); // 1 jam

        await db.query('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [resetToken, expiryDate, user.id]);

        // DIUBAH: Menggunakan variabel lingkungan untuk URL frontend
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const mailOptions = {
            from: `"CornLeaf AI" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: 'Pemulihan Kata Sandi Akun Anda',
            html: `<p>Halo ${user.full_name},</p><p>Klik link berikut untuk mereset kata sandi Anda: <a href="${resetLink}" style="background-color:#16a34a;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Kata Sandi</a></p><p>Link ini akan kedaluwarsa dalam 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p>`
        };
        // Tidak perlu 'await', biarkan proses pengiriman email berjalan di background
        transporter.sendMail(mailOptions).catch(err => console.error("Failed to send password reset email:", err));
    }

    res.status(200).json({ message: 'Jika email Anda terdaftar, link pemulihan telah dikirimkan.' });
}));

app.post('/api/reset-password', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Token dan kata sandi baru (minimal 6 karakter) diperlukan.' });
    }
    const [users] = await db.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()', [token]);
    if (users.length === 0) {
        return res.status(400).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
    }
    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [hashedPassword, user.id]);

    res.status(200).json({ message: 'Kata sandi berhasil diatur ulang.' });
}));

// -- Rute Riwayat (Dilindungi) --
app.post('/api/history/save', verifyToken, asyncHandler(async (req, res) => {
    const { detection_result, accuracy, recommendation, image_data } = req.body;
    if (!detection_result || !image_data) return res.status(400).json({ message: 'Data tidak lengkap.' });
    
    await db.query(
        'INSERT INTO scan_history (user_id, image_data, detection_result, accuracy, recommendation) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, image_data, detection_result, accuracy, JSON.stringify(recommendation)]
    );
    res.status(201).json({ message: 'Riwayat berhasil disimpan.' });
}));

app.get('/api/history', verifyToken, asyncHandler(async (req, res) => {
    const [history] = await db.query(
        "SELECT id, detection_result, accuracy, DATE_FORMAT(scanned_at, '%Y-%m-%d %H:%i:%s') as scanned_at, LEFT(image_data, 100) as image_preview FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC",
        [req.user.id]
    ); // DIUBAH: Tidak mengirim semua data base64 gambar, hanya preview
    res.json(history);
}));

app.delete('/api/history/:id', verifyToken, asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM scan_history WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Riwayat tidak ditemukan atau Anda tidak memiliki izin.' });
    res.status(200).json({ message: 'Riwayat berhasil dihapus.' });
}));

// -- Rute Profil (Dilindungi) --
app.get('/api/profile', verifyToken, asyncHandler(async (req, res) => {
    const [rows] = await db.query('SELECT id, full_name, email, profile_picture FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    res.json(rows[0]);
}));

app.put('/api/profile/details', verifyToken, asyncHandler(async (req, res) => {
    const { fullName, profilePicture } = req.body;

    // DIUBAH: Query dinamis untuk memperbarui hanya kolom yang diberikan
    const fieldsToUpdate = {};
    if (fullName) fieldsToUpdate.full_name = fullName;
    if (profilePicture !== undefined) fieldsToUpdate.profile_picture = profilePicture; // Cek 'undefined' agar bisa di-set ke NULL

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ message: 'Tidak ada data untuk diperbarui.' });
    }

    await db.query('UPDATE users SET ? WHERE id = ?', [fieldsToUpdate, req.user.id]);

    const [updatedUsers] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const authResponse = generateAuthResponse(updatedUsers[0]); // DIUBAH: Menggunakan helper
    
    res.json({ message: 'Profil berhasil diperbarui.', ...authResponse });
}));

app.put('/api/profile/password', verifyToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Isi semua kolom. Kata sandi baru minimal 6 karakter.' });
    }
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Kata sandi saat ini salah.' });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, req.user.id]);
    
    res.status(200).json({ message: 'Kata sandi berhasil diubah.' });
}));

// -- Rute Statistik --
app.get('/api/stats', verifyToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const queries = [
        db.query('SELECT COUNT(*) as totalScans FROM scan_history WHERE user_id = ?', [userId]),
        db.query("SELECT COUNT(*) as diseasesDetected FROM scan_history WHERE user_id = ? AND detection_result != 'Sehat'", [userId]),
        db.query('SELECT AVG(accuracy) as averageAccuracy FROM scan_history WHERE user_id = ?', [userId]),
        db.query('SELECT COUNT(*) as scansThisMonth FROM scan_history WHERE user_id = ? AND MONTH(scanned_at) = MONTH(CURRENT_DATE()) AND YEAR(scanned_at) = YEAR(CURRENT_DATE())', [userId])
    ];
    const results = await Promise.all(queries.map(p => p.then(res => res[0][0])));
    res.json({
        totalScans: results[0].totalScans || 0,
        diseasesDetected: results[1].diseasesDetected || 0,
        averageAccuracy: parseFloat(results[2].averageAccuracy || 0).toFixed(2),
        scansThisMonth: results[3].scansThisMonth || 0
    });
}));

// --- Middleware Penanganan Kesalahan Global ---
// BARU: Menangkap semua error yang terjadi di aplikasi
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan internal pada server.' });
});


// --- Mulai Server ---
app.listen(PORT, () => {
    console.log(`Backend API is running on http://localhost:${PORT}`);
});