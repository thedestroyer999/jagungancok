import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Camera,
  Save,
  KeyRound,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const response = await fetch("http://localhost:3001/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.clear();
          navigate("/login");
          return;
        }
        if (!response.ok) throw new Error("Gagal memuat profil.");

        const data = await response.json();
        setUser(data);
        setFullName(data.full_name);
        setImagePreview(
          data.profile_picture ||
            "https://placehold.co/120x120/E2E8F0/4A5568?text=User"
        );
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setProfilePictureFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setIsSavingDetails(true);
    setMessage({ type: "", text: "" });
    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:3001/api/profile/details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName,
          profilePicture: profilePictureFile || user.profile_picture,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("storage"));

      setMessage({ type: "success", text: "Detail profil berhasil diperbarui!" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Konfirmasi kata sandi baru tidak cocok." });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Kata sandi baru minimal harus 6 karakter." });
      return;
    }
    setIsSavingPassword(true);
    setMessage({ type: "", text: "" });
    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:3001/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ type: "success", text: "Kata sandi berhasil diubah!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading)
    return <LoadingSpinner text="Memuat Profil..." />;

  return (
    <div className="relative min-h-screen bg-white py-12 px-6 md:px-12">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-gradient-to-br from-green-200 to-emerald-300 rounded-full opacity-30 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-16 h-16 bg-gradient-to-tr from-green-300 to-emerald-400 rounded-full opacity-20 animate-bounce"></div>

      <div className="relative max-w-5xl mx-auto bg-white rounded-3xl shadow-xl p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-16 z-10">
        {/* Message Banner */}
        {message.text && (
          <div
            className={`col-span-full flex items-center gap-3 p-4 rounded-lg font-semibold ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Profile Details Card */}
        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Detail Profil</h2>
          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4">
              <img
                src={imagePreview}
                alt="Avatar"
                className="w-32 h-32 rounded-full border-4 border-green-400 object-cover shadow-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://placehold.co/120x120/E2E8F0/4A5568?text=User";
                }}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl font-semibold transition-shadow duration-300 shadow-md hover:shadow-xl"
                onClick={() => fileInputRef.current.click()}
              >
                <Camera size={16} />
                Ubah Foto
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                style={{ display: "none" }}
              />
            </div>

            <div>
              <label
                htmlFor="fullName"
                className="block text-gray-700 font-medium mb-2"
              >
                Nama Lengkap
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400 transition">
                <User size={20} className="text-green-600" />
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-gray-700 font-medium mb-2"
              >
                Email
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-2 bg-gray-50 text-gray-500 cursor-not-allowed">
                <Mail size={20} />
                <input
                  type="email"
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingDetails}
              className="inline-flex items-center gap-2 justify-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-transform duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSavingDetails ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </section>

        {/* Change Password Card */}
        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ubah Kata Sandi</h2>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-gray-700 font-medium mb-2"
              >
                Kata Sandi Saat Ini
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400 transition">
                <KeyRound size={20} className="text-green-600" />
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Masukkan kata sandi saat ini"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-gray-700 font-medium mb-2"
              >
                Kata Sandi Baru
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400 transition">
                <KeyRound size={20} className="text-green-600" />
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Minimal 6 karakter"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-gray-700 font-medium mb-2"
              >
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400 transition">
                <KeyRound size={20} className="text-green-600" />
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Ulangi kata sandi baru"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center gap-2 justify-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-transform duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSavingPassword ? "Menyimpan..." : "Ubah Kata Sandi"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
