import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertTriangle, Trash2, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';

import LoadingSpinner from '../components/LoadingSpinner';
import { getRecommendation } from '../utils/recommendations';

const HistoryPage = () => {
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State untuk mengelola modal konfirmasi hapus
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // State untuk mengelola modal detail
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Fungsi untuk mengambil data riwayat dari backend
    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');

        // Jika tidak ada token, pengguna belum login
        if (!token) {
            setError('Anda harus login untuk melihat riwayat.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Jika token ditolak (kadaluwarsa/tidak valid), logout otomatis
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
                return;
            }
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengambil data riwayat.');
            }
            setHistoryData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    // Panggil fetchHistory saat komponen pertama kali dimuat
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);
    
    // Fungsi untuk membuka modal konfirmasi hapus
    const openDeleteModal = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    // Fungsi untuk menutup modal konfirmasi hapus
    const closeDeleteModal = () => {
        setItemToDelete(null);
        setShowDeleteModal(false);
    };

    // Fungsi untuk menjalankan proses penghapusan
    const handleDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        setError(null);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`http://localhost:3001/api/history/${itemToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Gagal menghapus riwayat.');
            }
            
            setHistoryData(prevData => prevData.filter(item => item.id !== itemToDelete.id));

        } catch (err) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
            closeDeleteModal();
        }
    };

    // Fungsi untuk membuka modal detail
    const openDetailModal = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };

    // Fungsi untuk menutup modal detail
    const closeDetailModal = () => {
        setSelectedItem(null);
        setShowDetailModal(false);
    };

    // Fungsi untuk mengunduh PDF dari data riwayat
    const downloadPdfFromHistory = async (item) => {
        if (!item) {
            alert("Tidak ada data riwayat untuk diunduh.");
            return;
        }

        const doc = new jsPDF();
        const detectionDateTime = new Date(item.scanned_at);

        const recommendationObj = getRecommendation(item.detection_result);
        
        const recommendationList = recommendationObj && Array.isArray(recommendationObj.actions) 
                                   ? recommendationObj.actions 
                                   : ['Tidak ada rekomendasi penanganan yang tersedia.'];

        const detectedTitle = recommendationObj.title || item.detection_result;
        const detectedDescription = recommendationObj.description || "Tidak ada deskripsi tersedia.";
        const detectedIcon = recommendationObj.icon || ""; 

        // --- Header PDF ---
        doc.setFontSize(22);
        doc.text("Laporan Deteksi Penyakit Daun Jagung", 10, 20); 
        doc.setFontSize(10);
        doc.text("Aplikasi Scanner Daun Jagung - Riwayat", 10, 27);
        doc.setLineWidth(0.5);
        doc.line(10, 30, 200, 30); 

        // --- Informasi Deteksi ---
        doc.setFontSize(12);
        doc.text(`Tanggal Deteksi: ${detectionDateTime.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, 10, 40);
        doc.text(`Waktu Deteksi: ${detectionDateTime.toLocaleTimeString('id-ID')}`, 10, 47);
        doc.text(`Sumber Gambar: Riwayat Pindai`, 10, 54);

        // --- Gambar yang Dideteksi ---
        const startYImage = 63;
        doc.setFontSize(14);
        doc.text("Gambar yang Dideteksi:", 10, startYImage);

        if (item.image_data) {
            const img = new Image();
            img.src = item.image_data;
            img.onload = () => {
                const imgWidth = 80; 
                const imgHeight = (img.height * imgWidth) / img.width; 
                const imgX = 10;
                const imgY = startYImage + 7; 
                doc.addImage(item.image_data, 'JPEG', imgX, imgY, imgWidth, imgHeight);
                
                // --- Hasil Deteksi ---
                let currentY = imgY + imgHeight + 10; 
                doc.setFontSize(14);
                doc.text("Hasil :", 10, currentY);
                currentY += 10;
                doc.setFontSize(12);
                doc.text(`Penyakit Teridentifikasi: ${detectedIcon} ${detectedTitle}`, 10, currentY); 
                currentY += 7;
                doc.text(`Deskripsi: ${detectedDescription}`, 10, currentY); 
                currentY += 7;
                doc.text(`Tingkat Keyakinan: ${(item.accuracy * 100).toFixed(2)}%`, 10, currentY);
                currentY += 17; 

                // --- Rekomendasi Penanganan ---
                doc.setFontSize(14);
                doc.text("Rekomendasi Penanganan:", 10, currentY);
                currentY += 10; 
                doc.setFontSize(12);

                recommendationList.forEach((action, index) => {
                    const listItemText = `${index + 1}. ${action}`; 
                    const splitText = doc.splitTextToSize(listItemText, 180); 
                    doc.text(splitText, 10, currentY);
                    currentY += (splitText.length * 5) + 3; 
                });

                // --- Disclaimer ---
                currentY = Math.max(currentY, doc.internal.pageSize.height - 30); 
                const disclaimerText = "Catatan: Hasil deteksi ini dihasilkan oleh model AI dan ditujukan sebagai panduan awal. Untuk diagnosis dan penanganan yang lebih akurat, sangat disarankan untuk berkonsultasi dengan ahli pertanian atau agronomis.";
                const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
                doc.setFontSize(8);
                doc.setTextColor(100); 
                doc.text(splitDisclaimer, 10, currentY);

                doc.save(`Laporan_Deteksi_Riwayat_${item.detection_result}_${detectionDateTime.toISOString().slice(0,10)}.pdf`);
            };
            img.onerror = () => {
                alert("Gagal memuat gambar untuk PDF.");
            };
        } else {
            // Fallback jika image_data tidak tersedia
            let currentY = startYImage + 7;
            doc.setFontSize(14);
            doc.text("Hasil:", 10, currentY);
            currentY += 10;
            doc.setFontSize(12);
            doc.text(`Penyakit Teridentifikasi: ${detectedIcon} ${detectedTitle}`, 10, currentY);
            currentY += 7;
            doc.text(`Deskripsi: ${detectedDescription}`, 10, currentY);
            currentY += 7;
            doc.text(`Tingkat Keyakinan: ${(item.accuracy * 100).toFixed(2)}%`, 10, currentY);
            currentY += 17;

            doc.setFontSize(14);
            doc.text("Rekomendasi Penanganan:", 10, currentY);
            currentY += 10;
            doc.setFontSize(12);

            recommendationList.forEach((action, index) => {
                const listItemText = `${index + 1}. ${action}`;
                const splitText = doc.splitTextToSize(listItemText, 180);
                doc.text(splitText, 10, currentY);
                currentY += (splitText.length * 5) + 3; 
            });

            currentY = Math.max(currentY, doc.internal.pageSize.height - 30);
            const disclaimerText = "Catatan: Hasil deteksi ini dihasilkan oleh model AI dan ditujukan sebagai panduan awal. Untuk diagnosis dan penanganan yang lebih akurat, sangat disarankan untuk berkonsultasi dengan ahli pertanian atau agronomis.";
            const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(splitDisclaimer, 10, currentY);

            doc.save(`Laporan_Deteksi_Riwayat_${item.detection_result}_${detectionDateTime.toISOString().slice(0,10)}.pdf`);
        }
    };

    // Fungsi utilitas untuk format tanggal
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    // Fungsi utilitas untuk styling status
    const getStatusClass = (result) => {
        if (result === 'Sehat') return 'bg-green-100 text-green-800 border-green-200';
        if (result === 'Karat' || result === 'Hawar') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };
    
    const getStatusText = (result) => {
        if (result === 'Sehat') return 'Sehat';
        return 'Tindakan Diperlukan';
    };

    if (isLoading) {
        return <LoadingSpinner text="Memuat riwayat Anda..." />;
    }
    
    return (
        <>
            <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-left">
                        Riwayat Pindai
                    </h2>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center">
                                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                                <p className="text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {historyData.length > 0 ? (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                    Gambar
                                                </th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                    Tanggal
                                                </th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                    Hasil
                                                </th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                    Akurasi
                                                </th>
                                                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {historyData.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <img 
                                                            src={item.image_data} 
                                                            alt={item.detection_result} 
                                                            className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(item.scanned_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.detection_result}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {(item.accuracy * 100).toFixed(1)}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusClass(item.detection_result)}`}>
                                                            {getStatusText(item.detection_result)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex justify-center space-x-2">
                                                            <button 
                                                                onClick={() => openDetailModal(item)} 
                                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Lihat Detail"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => downloadPdfFromHistory(item)} 
                                                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Unduh PDF"
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => openDeleteModal(item)} 
                                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="lg:hidden">
                                    {historyData.map((item) => (
                                        <div key={item.id} className="border-b border-gray-200 p-4 last:border-b-0">
                                            <div className="flex items-start space-x-4">
                                                <img 
                                                    src={item.image_data} 
                                                    alt={item.detection_result} 
                                                    className="h-20 w-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                                            {item.detection_result}
                                                        </h3>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border mt-1 sm:mt-0 sm:ml-2 ${getStatusClass(item.detection_result)}`}>
                                                            {getStatusText(item.detection_result)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mb-1">
                                                        {formatDate(item.scanned_at)}
                                                    </p>
                                                    <p className="text-sm text-gray-500 mb-3">
                                                        Akurasi: {(item.accuracy * 100).toFixed(1)}%
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button 
                                                            onClick={() => openDetailModal(item)} 
                                                            className="flex items-center px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Eye size={14} className="mr-1" />
                                                            Detail
                                                        </button>
                                                        <button 
                                                            onClick={() => downloadPdfFromHistory(item)} 
                                                            className="flex items-center px-3 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                                                        >
                                                            <Download size={14} className="mr-1" />
                                                            PDF
                                                        </button>
                                                        <button 
                                                            onClick={() => openDeleteModal(item)} 
                                                            className="flex items-center px-3 py-1 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                                                        >
                                                            <Trash2 size={14} className="mr-1" />
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada riwayat</h3>
                                <p className="text-gray-500">Anda belum memiliki riwayat pemindaian.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi Hapus */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Konfirmasi Hapus
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Apakah Anda yakin ingin menghapus riwayat pindai ini secara permanen?
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
                                    <button 
                                        onClick={closeDeleteModal} 
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        disabled={isDeleting}
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={handleDelete} 
                                        disabled={isDeleting} 
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Penyakit */}
            {showDetailModal && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Detail Hasil Pindai
                            </h3>
                            <button 
                                onClick={closeDetailModal} 
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Tutup"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row gap-6 mb-6">
                                <div className="lg:w-1/3">
                                    <img 
                                        src={selectedItem.image_data} 
                                        alt="Hasil Pindai" 
                                        className="w-full h-64 lg:h-80 object-cover rounded-lg border border-gray-200"
                                    />
                                </div>
                                <div className="lg:w-2/3">
                                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Tanggal Pindai</p>
                                                <p className="text-base text-gray-900">{formatDate(selectedItem.scanned_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Tingkat Akurasi</p>
                                                <p className="text-base text-gray-900">{(selectedItem.accuracy * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(() => {
                                        const recommendation = getRecommendation(selectedItem.detection_result);
                                        return (
                                            <div>
                                                <div className="mb-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                        Penyakit Teridentifikasi
                                                    </h4>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-2xl">{recommendation.icon}</span>
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-800">
                                                                {recommendation.title || selectedItem.detection_result}
                                                            </p>
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusClass(selectedItem.detection_result)}`}>
                                                                {getStatusText(selectedItem.detection_result)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 leading-relaxed">{recommendation.description}</p>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                        Rekomendasi Penanganan
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {recommendation.actions.map((action, index) => (
                                                            <li key={index} className="flex items-start">
                                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-gray-700 leading-relaxed">{action}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <button 
                                onClick={closeDetailModal} 
                                className="px-6 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Tutup
                            </button>
                            <button 
                                onClick={() => downloadPdfFromHistory(selectedItem)} 
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                            >
                                <Download size={18} className="mr-2" /> 
                                Unduh Laporan PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HistoryPage;