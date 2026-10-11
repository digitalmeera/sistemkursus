import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../components/ui';
import { gasApi } from '../services/gasApi';
import { AdminUser, ProfilLembaga } from '../types';

interface LoginPageProps {
  onLoginSuccess: (admin: AdminUser) => void;
  profil: ProfilLembaga;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, profil }) => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Digitalmeera@2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await gasApi.login(username.trim(), password);
      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setError(res.message || 'Login gagal. Periksa username dan password.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-5 flex items-center gap-3">
          <BrandLogo
            src={profil.logo}
            boxClassName="h-10 w-10 rounded-md border border-[#e3e9ef] bg-white"
          />
          <div>
            <p className="text-[15px] font-semibold text-[#1a2430] leading-none">
              {profil.namaLembaga || 'DIGITALMEERA'}
            </p>
            <p className="mt-1 text-[12px] text-[#4b5a6a]">Sistem pendaftaran & absensi kursus</p>
          </div>
        </div>

        <div className="dm-card p-6">
          <h1 className="text-[15px] font-semibold text-[#1a2430]">Masuk</h1>
          <p className="mt-0.5 text-[12px] text-[#4b5a6a]">Gunakan akun administrator untuk mengelola data.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-[#f0c9c9] bg-[#fdf0f0] p-2.5 text-[12px] text-[#a02a2a]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                className="dm-input"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="dm-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8494a5] hover:text-[#1a2430]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="dm-btn-primary w-full justify-center">
              {loading ? (
                <span>Memverifikasi…</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#8494a5]">
          {profil.footer || '© DIGITALMEERA — Sistem Kursus & Les Privat'}
        </p>
      </div>
    </div>
  );
};
