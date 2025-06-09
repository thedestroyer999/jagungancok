import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Camera, Upload, Save, LogIn, Download } from "lucide-react";

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { useTensorFlowModel } from "../hooks/useTensorFlowModel";
import { usePrediction } from "../hooks/usePrediction";
import { useCamera } from "../hooks/useCamera";
import LoadingSpinner from "../components/LoadingSpinner";
import ModelStatus from "../components/ModelStatus";
import UploadTab from '../components/UploadTab';
import CameraTab from '../components/CameraTab';
import ImagePreview from "../components/ImagePreview";
import PredictionResult from "../components/PredictionResult";
import { getRecommendation } from '../utils/recommendations'; // Pastikan path ini benar

const CornLeafDetectionPage = () => {
    const navigate = useNavigate();
    const { model, isLoadingModel, modelError } = useTensorFlowModel();
    const { result, isPredicting, predictionError, performPrediction, resetPrediction } = usePrediction();
    
    const [preview, setPreview] = useState(null);
    const [activeTab, setActiveTab] = useState('upload');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
        if (token) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.name) {
                setUserName(user.name);
            }
        }
    }, []);

    const saveHistory = async () => {
        if (!result || !isLoggedIn || !preview) return; 
        
        const token = localStorage.getItem('token');
        setIsSaving(true);
        setSaveMessage('');
        
        // Dapatkan objek rekomendasi lengkap
        const recommendationObj = getRecommendation(result.className);
        
        // Ubah array actions menjadi string tunggal dengan baris baru untuk penyimpanan di backend
        // Menggunakan actions dari objek rekomendasi
        const recommendationData = recommendationObj && Array.isArray(recommendationObj.actions) 
                                   ? recommendationObj.actions.join('\n') 
                                   : 'Tidak ada rekomendasi tindakan.';
        
        try {
            const response = await fetch('http://localhost:3001/api/history/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    detection_result: result.className,
                    accuracy: result.probability,
                    // Mengirim deskripsi umum dari rekomendasiObj, atau 'actions' jika itu yang diharapkan backend
                    recommendation: recommendationObj.description || 'Tidak ada deskripsi rekomendasi.', // Sesuaikan ini jika backend mengharapkan 'actions'
                    image_data: preview 
                })
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
                return;
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Gagal menyimpan.');
            setSaveMessage(data.message);

        } catch (error) {
            setSaveMessage(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- FUNGSI DOWNLOAD PDF ---
    const downloadPdf = async () => {
        if (!result || !preview) {
            alert("Tidak ada hasil deteksi atau gambar untuk diunduh.");
            return;
        }

        const doc = new jsPDF();
        const detectionDateTime = new Date();

        // Dapatkan objek rekomendasi lengkap dari fungsi getRecommendation
        const recommendationObj = getRecommendation(result.className);
        
        // Menggunakan properti 'actions' dari objek rekomendasi untuk daftar di PDF
        const recommendationList = recommendationObj && Array.isArray(recommendationObj.actions) 
                                   ? recommendationObj.actions 
                                   : ['Tidak ada rekomendasi penanganan yang tersedia.'];

        // Menggunakan properti 'title' dan 'description' dari objek rekomendasi
        const detectedTitle = recommendationObj.title || result.className;
        const detectedDescription = recommendationObj.description || "Tidak ada deskripsi tersedia.";
        const detectedIcon = recommendationObj.icon || ""; // Ambil icon

        // --- Header PDF ---
        doc.setFontSize(22);
        doc.text("Laporan Deteksi Penyakit Daun Jagung", 10, 20); // Judul utama
        doc.setFontSize(10);
        doc.text("Aplikasi Scanner Daun Jagung - Powered by AI", 10, 27); // Nama aplikasi
        doc.setLineWidth(0.5);
        doc.line(10, 30, 200, 30); // Garis pemisah

        // --- Informasi Deteksi ---
        doc.setFontSize(12);
        doc.text(`Tanggal Deteksi: ${detectionDateTime.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, 10, 40);
        doc.text(`Waktu Deteksi: ${detectionDateTime.toLocaleTimeString('id-ID')}`, 10, 47);
        if (userName) {
            doc.text(`Pengguna: ${userName}`, 10, 54);
        }
        doc.text(`Sumber Gambar: ${activeTab === 'upload' ? 'Unggah Gambar' : 'Kamera'}`, 10, userName ? 61 : 54);

        // --- Gambar yang Dideteksi ---
        const startYImage = userName ? 70 : 63;
        doc.setFontSize(14);
        doc.text("Gambar yang Dideteksi:", 10, startYImage);

        if (preview) {
            const img = new Image();
            img.src = preview;
            img.onload = () => {
                const imgWidth = 80; // Lebar gambar di PDF (sesuaikan jika perlu)
                const imgHeight = (img.height * imgWidth) / img.width; // Proporsi tinggi otomatis
                const imgX = 10;
                const imgY = startYImage + 7; // Posisi Y gambar di bawah judul
                doc.addImage(preview, 'JPEG', imgX, imgY, imgWidth, imgHeight);
                
                // --- Hasil Deteksi ---
                let currentY = imgY + imgHeight + 10; // Posisi Y setelah gambar
                doc.setFontSize(14);
                doc.text("Hasil Deteksi:", 10, currentY);
                currentY += 10;
                doc.setFontSize(12);
                doc.text(`Penyakit Teridentifikasi: ${detectedIcon} ${detectedTitle}`, 10, currentY); // Tambahkan icon
                currentY += 7;
                doc.text(`Deskripsi: ${detectedDescription}`, 10, currentY); // Tambahkan deskripsi
                currentY += 7;
                doc.text(`Tingkat Keyakinan: ${(result.probability * 100).toFixed(2)}%`, 10, currentY);
                currentY += 17; // Spasi sebelum rekomendasi

                // --- Rekomendasi Penanganan (Daftar Berpoin) ---
                doc.setFontSize(14);
                doc.text("Rekomendasi Penanganan:", 10, currentY);
                currentY += 10; // Spasi setelah judul rekomendasi
                doc.setFontSize(12);

                // Iterasi setiap item dalam daftar rekomendasi dan menuliskannya sebagai poin bernomor
                recommendationList.forEach((item, index) => {
                    const listItemText = `${index + 1}. ${item}`; // Format "1. Rekomendasi pertama"
                    // Split teks jika terlalu panjang agar tidak keluar batas halaman
                    const splitText = doc.splitTextToSize(listItemText, 180); // 180mm lebar untuk teks
                    doc.text(splitText, 10, currentY);
                    // Menyesuaikan posisi Y untuk baris berikutnya, memperhitungkan tinggi teks dan spasi antar poin
                    currentY += (splitText.length * 5) + 3; // (jumlah baris * perkiraan tinggi baris) + spasi ekstra
                });

                // --- Disclaimer dan Catatan Kaki ---
                // Pastikan currentY tidak menimpa disclaimer di bagian bawah halaman
                currentY = Math.max(currentY, doc.internal.pageSize.height - 30); 
                const disclaimerText = "Catatan: Hasil deteksi ini dihasilkan oleh model AI dan ditujukan sebagai panduan awal. Untuk diagnosis dan penanganan yang lebih akurat, sangat disarankan untuk berkonsultasi dengan ahli pertanian atau agronomis.";
                const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
                doc.setFontSize(8);
                doc.setTextColor(100); // Warna teks abu-abu
                doc.text(splitDisclaimer, 10, currentY);

                doc.save(`Laporan_Deteksi_Daun_Jagung_${detectionDateTime.toISOString().slice(0,10)}.pdf`);
            };
            img.onerror = () => {
                alert("Gagal memuat gambar untuk PDF.");
            };
        } else {
            // Logika fallback jika preview tidak tersedia saat mencoba mengunduh (seharusnya tombol di-disable jika tidak ada preview)
            let currentY = startYImage + 7;
            doc.setFontSize(14);
            doc.text("Hasil Deteksi:", 10, currentY);
            currentY += 10;
            doc.setFontSize(12);
            doc.text(`Penyakit Teridentifikasi: ${detectedIcon} ${detectedTitle}`, 10, currentY);
            currentY += 7;
            doc.text(`Deskripsi: ${detectedDescription}`, 10, currentY);
            currentY += 7;
            doc.text(`Tingkat Keyakinan: ${(result.probability * 100).toFixed(2)}%`, 10, currentY);
            currentY += 17;

            doc.setFontSize(14);
            doc.text("Rekomendasi Penanganan:", 10, currentY);
            currentY += 10;
            doc.setFontSize(12);

            recommendationList.forEach((item, index) => {
                const listItemText = `${index + 1}. ${item}`;
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

            doc.save(`Laporan_Deteksi_Daun_Jagung_${detectionDateTime.toISOString().slice(0,10)}.pdf`);
        }
    };

    const processFile = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result); 
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                performPrediction(model, img);
            };
        };
        reader.readAsDataURL(file);
    }, [model, performPrediction]);

    const { videoRef, canvasRef, isCameraOpen, cameraError, openCamera, closeCamera, capturePhoto } = useCamera((file) => {
        processFile(file);
        setActiveTab('upload');
    });

    const resetAll = useCallback(() => {
        setPreview(null);
        resetPrediction();
        setSaveMessage('');
    }, [resetPrediction]);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (!file) { resetAll(); return; }
        resetAll();
        processFile(file);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (isCameraOpen) closeCamera();
        if (tab !== activeTab) {
            resetAll();
            setPreview(null);
        }
    };

    if (isLoadingModel) {
        return <LoadingSpinner text="Memuat model AI, mohon tunggu..." />;
    }

    const showCameraResult = activeTab === 'camera' && !isCameraOpen && preview;

    return (
        <div className="min-h-screen py-12 px-6">
            <div className="max-w-4xl mx-auto text-center">
                <Leaf className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Scanner Daun Jagung</h1>
                <p className="text-gray-600 mb-8">Unggah gambar atau gunakan kamera untuk analisis penyakit secara instan.</p>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
                    <div className="flex border-b border-gray-200">
                        <button onClick={() => handleTabChange('upload')} className={`flex-1 py-4 px-6 font-medium transition-colors ${ activeTab === 'upload' ? 'bg-green-50 text-green-600 border-b-2 border-green-500' : 'text-gray-600 hover:text-gray-800' }`}>
                            <Upload className="w-5 h-5 inline mr-2" /> Unggah Gambar
                        </button>
                        <button onClick={() => handleTabChange('camera')} className={`flex-1 py-4 px-6 font-medium transition-colors ${ activeTab === 'camera' ? 'bg-green-50 text-green-600 border-b-2 border-green-500' : 'text-gray-600 hover:text-gray-800' }`}>
                            <Camera className="w-5 h-5 inline mr-2" /> Gunakan Kamera
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'upload' && (
                           <UploadTab model={model} isPredicting={isPredicting} error={predictionError || modelError} result={result} preview={preview} onImageUpload={handleImageUpload} onReset={resetAll}/>
                        )}
                        {activeTab === 'camera' && (
                            <>
                                <CameraTab videoRef={videoRef} isCameraOpen={isCameraOpen} cameraError={cameraError || modelError} openCamera={openCamera} closeCamera={closeCamera} capturePhoto={capturePhoto} isPredicting={isPredicting} modelReady={!!model} />
                                {showCameraResult && (
                                    <>
                                        <ImagePreview preview={preview} onReset={resetAll} />
                                        <PredictionResult result={result} error={predictionError} />
                                    </>
                                )}
                            </>
                        )}

                        {result && !predictionError && (
                            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                                <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-4 space-y-3 sm:space-y-0 mb-4">
                                    {isLoggedIn && (
                                        <button
                                            onClick={saveHistory}
                                            disabled={isSaving || !!saveMessage}
                                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Save className="w-5 h-5 mr-2" />
                                            {isSaving ? 'Menyimpan...' : 'Simpan Hasil ke Riwayat'}
                                        </button>
                                    )}
                                    <button
                                        onClick={downloadPdf}
                                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                        disabled={!result || !preview}
                                    >
                                        <Download className="w-5 h-5 mr-2" />
                                        Unduh Laporan PDF
                                    </button>
                                </div>
                                {saveMessage && (
                                    <p className={`mt-4 text-sm font-medium ${saveMessage.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>
                                        {saveMessage}
                                    </p>
                                )}
                                {!isLoggedIn && (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-center">
                                            <LogIn className="w-6 h-6 mr-3 text-blue-600" />
                                            <p className="text-gray-700">
                                                Silakan{' '}
                                                <Link to="/login" className="font-bold text-blue-600 hover:underline">
                                                    login
                                                </Link>
                                                {' '}untuk menyimpan hasil pindai ini.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <ModelStatus model={model} isLoadingModel={isLoadingModel} error={modelError} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    );
};

export default CornLeafDetectionPage;