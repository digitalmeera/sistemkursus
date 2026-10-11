import React, { useState, useEffect } from 'react';
import { ProfilLembaga, Shift, CardTemplateConfig, AdminUser } from '../types';
import { gasApi } from '../services/gasApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader, Card, Toast, EmptyState, StatusBadge } from '../components/ui';
import {
  User,
  Building2,
  Clock,
  CreditCard,
  Upload,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Link2,
  Save,
  RefreshCw,
  Code2,
  Image as ImageIcon,
  QrCode as QrCodeIcon,
  ExternalLink
} from 'lucide-react';
import { generateQrCodeDataUrl } from '../lib/qrcode';

interface PengaturanPageProps {
  profil: ProfilLembaga;
  onProfilUpdated: (p: ProfilLembaga) => void;
  adminUser: AdminUser;
  onAdminUpdated: (admin: AdminUser) => void;
  onOpenCodeModal: () => void;
  onOpenGasModal: () => void;
}

export const PengaturanPage: React.FC<PengaturanPageProps> = ({
  profil,
  onProfilUpdated,
  adminUser,
  onAdminUpdated,
  onOpenCodeModal,
  onOpenGasModal,
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'lembaga' | 'shift' | 'kartu' | 'backend'>('admin');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Tab A: Admin State
  const [adminUsername, setAdminUsername] = useState<string>(adminUser.username);
  const [adminNama, setAdminNama] = useState<string>(adminUser.nama);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [adminSaving, setAdminSaving] = useState<boolean>(false);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab B: Lembaga State
  const [namaLembaga, setNamaLembaga] = useState<string>(profil.namaLembaga);
  const [logo, setLogo] = useState<string>(profil.logo || '');
  const [alamat, setAlamat] = useState<string>(profil.alamat);
  const [nomorWA, setNomorWA] = useState<string>(profil.nomorWA);
  const [email, setEmail] = useState<string>(profil.email);
  const [website, setWebsite] = useState<string>(profil.website);
  const [footer, setFooter] = useState<string>(profil.footer);
  const [lembagaSaving, setLembagaSaving] = useState<boolean>(false);

  // Tab C: Shift State
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [shiftModalOpen, setShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftNama, setShiftNama] = useState<string>('');
  const [shiftJamMulai, setShiftJamMulai] = useState<string>('08:00');
  const [shiftJamSelesai, setShiftJamSelesai] = useState<string>('10:00');
  const [shiftStatus, setShiftStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  // Tab D: Kartu Config State
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig>({
    theme: 'modern-navy',
    accentColor: '#0ea5e9',
    barcodeSize: 'large',
    showPhoto: true,
    showProgram: true,
    showWatermark: true,
  });

  // Tab E: Backend GAS URL
  const [gasUrl, setGasUrl] = useState<string>(gasApi.getApiUrl());
  const [testingGas, setTestingGas] = useState<boolean>(false);

  useEffect(() => {
    // Load shifts & card config
    const load = async () => {
      const [sRes, cCfg] = await Promise.all([
        gasApi.getShifts(),
        gasApi.getCardConfig(),
      ]);
      if (sRes.success && sRes.data) setShifts(sRes.data);
      if (cCfg) setCardConfig(cCfg);
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Submit Admin Profile
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setAdminMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setAdminSaving(true);
    try {
      const res = await gasApi.updateAdmin(
        adminUser.id,
        adminUsername,
        adminNama,
        currentPassword,
        newPassword || undefined
      );

      if (res.success) {
        setAdminMsg({ type: 'success', text: 'Profil administrator berhasil disimpan.' });
        onAdminUpdated({ ...adminUser, username: adminUsername, nama: adminNama });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setAdminMsg({ type: 'error', text: res.message || 'Gagal menyimpan profil.' });
      }
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setAdminSaving(false);
    }
  };

  // Submit Profil Lembaga
  const handleSaveLembaga = async (e: React.FormEvent) => {
    e.preventDefault();
    setLembagaSaving(true);
    try {
      const updated: ProfilLembaga = {
        namaLembaga,
        logo,
        alamat,
        nomorWA,
        email,
        website,
        footer,
      };
      const res: any = await gasApi.updateProfil(updated);
      if (res.success) {
        // Pakai URL kanonis dari server (thumbnail Drive) agar tidak menumpuk file & langsung tampil.
        const canonical = { ...updated, logo: res.logo || logo };
        setLogo(canonical.logo);
        onProfilUpdated(canonical);
        showToast('Identitas lembaga berhasil diperbarui.');
      } else {
        showToast(res.message || 'Gagal menyimpan identitas lembaga.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLembagaSaving(false);
    }
  };

  // Upload Logo Lembaga
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Shift CRUD Handlers
  const handleOpenAddShift = () => {
    setEditingShift(null);
    setShiftNama('');
    setShiftJamMulai('08:00');
    setShiftJamSelesai('10:00');
    setShiftStatus('Aktif');
    setShiftModalOpen(true);
  };

  const handleOpenEditShift = (s: Shift) => {
    setEditingShift(s);
    setShiftNama(s.namaShift);
    setShiftJamMulai(s.jamMulai);
    setShiftJamSelesai(s.jamSelesai);
    setShiftStatus(s.status);
    setShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftNama.trim()) return;

    if (editingShift) {
      const res = await gasApi.updateShift({
        ...editingShift,
        namaShift: shiftNama.trim(),
        jamMulai: shiftJamMulai,
        jamSelesai: shiftJamSelesai,
        status: shiftStatus,
      });
      if (res.success) {
        showToast('Shift berhasil diperbarui.');
        setShiftModalOpen(false);
        const sRes = await gasApi.getShifts();
        if (sRes.success && sRes.data) setShifts(sRes.data);
      }
    } else {
      const res = await gasApi.createShift({
        namaShift: shiftNama.trim(),
        jamMulai: shiftJamMulai,
        jamSelesai: shiftJamSelesai,
        status: shiftStatus,
      });
      if (res.success) {
        showToast('Shift baru berhasil ditambahkan.');
        setShiftModalOpen(false);
        const sRes = await gasApi.getShifts();
        if (sRes.success && sRes.data) setShifts(sRes.data);
      }
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    const res = await gasApi.deleteShift(shiftToDelete.idShift);
    if (res.success) {
      showToast('Shift berhasil dihapus.');
      setShiftToDelete(null);
      const sRes = await gasApi.getShifts();
      if (sRes.success && sRes.data) setShifts(sRes.data);
    }
  };

  // Tab D: Card Template State
  const [templateUploading, setTemplateUploading] = useState<boolean>(false);
  const [sampleQrUrl, setSampleQrUrl] = useState<string>('');

  useEffect(() => {
    generateQrCodeDataUrl('DM0001', { size: 200, margin: 1 }).then((url) => {
      setSampleQrUrl(url);
    });
  }, []);

  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      showToast('Format file harus berupa gambar JPG atau PNG.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran file maksimal 8 MB.');
      return;
    }

    setTemplateUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
          setCardConfig((prev) => ({
            ...prev,
            templateImage: dataUrl,
            useCustomTemplate: true,
          }));
          showToast('Template kartu berhasil diunggah! Klik Simpan Pengaturan Kartu.');
        }
        setTemplateUploading(false);
      };
      img.onerror = () => {
        setTemplateUploading(false);
        showToast('Gagal memproses gambar template.');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Save Card Config
  const handleSaveCardConfig = () => {
    gasApi.saveCardConfig(cardConfig);
    showToast('Konfigurasi template kartu berhasil disimpan.');
  };

  const [syncingNow, setSyncingNow] = useState<boolean>(false);

  // Test GAS URL
  const handleTestGas = async () => {
    setTestingGas(true);
    const res = await gasApi.testConnection(gasUrl);
    setTestingGas(false);
    showToast(res.message);
  };

  const handleSaveGasUrl = () => {
    gasApi.setApiUrl(gasUrl);
    showToast('URL Google Apps Script berhasil disimpan!');
    handleTestGas();
  };

  const handleResetGasUrl = () => {
    const defaultUrl = gasApi.resetToDefaultUrl();
    setGasUrl(defaultUrl);
    showToast('URL Google Apps Script direset ke URL resmi Digitalmeera.');
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    const res = await gasApi.syncAll(true);
    setSyncingNow(false);
    if (res.success && res.data) {
      showToast(res.message || `Data berhasil disegarkan! ${res.data.peserta.length} peserta di Spreadsheet.`);
    } else {
      showToast(res.message || 'Gagal menyegarkan data dari Spreadsheet.');
    }
  };

  void onOpenGasModal;

  const tabs = [
    { key: 'admin', label: 'Profil Admin', icon: <User className="h-4 w-4" /> },
    { key: 'lembaga', label: 'Identitas Lembaga', icon: <Building2 className="h-4 w-4" /> },
    { key: 'shift', label: 'Jam Presensi & Shift', icon: <Clock className="h-4 w-4" /> },
    { key: 'kartu', label: 'Template Kartu', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'backend', label: 'Koneksi Google Spreadsheet', icon: <Link2 className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="space-y-4">
      <Toast message={toastMessage} />
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi akun administrator, identitas lembaga, jam shift presensi, template kartu, dan API backend."
      />

      {/* Tab Navigation */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold ${
                activeTab === t.key
                  ? 'border-[#0f4c73] bg-[#0f4c73] text-white'
                  : 'border-transparent text-[#4b5a6a] hover:bg-[#f0f3f6]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* TAB A: PROFIL ADMIN */}
      {activeTab === 'admin' && (
        <Card className="max-w-2xl p-4">
          <h3 className="text-[13px] font-semibold text-[#1a2430]">
            Akun & Keamanan Administrator
          </h3>
          <p className="mt-0.5 text-[13px] text-[#4b5a6a]">
            Ganti username atau password administrator untuk menjaga keamanan sistem.
          </p>

          {adminMsg && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#e3e9ef] bg-[#f7f9fb] p-3 text-[13px]">
              {adminMsg.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f4c73]" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#a02a2a]" />
              )}
              <p className="font-medium text-[#1a2430]">{adminMsg.text}</p>
            </div>
          )}

          <form onSubmit={handleSaveAdmin} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Username Admin
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="dm-input"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Nama Lengkap Administrator
              </label>
              <input
                type="text"
                value={adminNama}
                onChange={(e) => setAdminNama(e.target.value)}
                required
                className="dm-input"
              />
            </div>

            <div className="border-t border-[#e3e9ef] pt-3">
              <h4 className="text-[13px] font-semibold text-[#1a2430]">
                Ubah Password
              </h4>
              <p className="mt-0.5 text-[12px] text-[#8494a5]">
                Kosongkan jika tidak ingin mengganti password.
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">Password Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini jika ganti password..."
                    className="dm-input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="dm-input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="dm-input"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={adminSaving}
                className="dm-btn-primary"
              >
                <Save className="h-4 w-4" />
                <span>{adminSaving ? 'Menyimpan...' : 'Simpan Profil Admin'}</span>
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB B: IDENTITAS LEMBAGA */}
      {activeTab === 'lembaga' && (
        <Card className="max-w-2xl p-4">
          <h3 className="text-[13px] font-semibold text-[#1a2430]">
            Identitas Lembaga Digitalmeera
          </h3>
          <p className="mt-0.5 text-[13px] text-[#4b5a6a]">
            Nama lembaga dan logo ini akan ditampilkan pada kop laporan, kartu peserta, login, dan header.
          </p>

          <form onSubmit={handleSaveLembaga} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Logo Digitalmeera
              </label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-[#e3e9ef] bg-[#f7f9fb]">
                  {logo ? (
                    <img src={logo} alt="Logo" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[13px] font-semibold text-[#8494a5]">DM</span>
                  )}
                </div>
                <label className="dm-btn-secondary cursor-pointer !py-2">
                  Ganti Logo
                  <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                </label>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo('')}
                    className="rounded-md p-1.5 text-[13px] font-medium text-[#a02a2a] hover:bg-[#fdf0f0]"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Nama Lembaga
              </label>
              <input
                type="text"
                value={namaLembaga}
                onChange={(e) => setNamaLembaga(e.target.value)}
                required
                className="dm-input"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Alamat Lembaga
              </label>
              <textarea
                rows={2}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="dm-input"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={nomorWA}
                  onChange={(e) => setNomorWA(e.target.value)}
                  className="dm-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="dm-input"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="dm-input"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Teks Footer Website
              </label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                className="dm-input"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={lembagaSaving}
                className="dm-btn-primary"
              >
                <Save className="h-4 w-4" />
                <span>{lembagaSaving ? 'Menyimpan...' : 'Simpan Identitas Lembaga'}</span>
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB C: JAM PRESENSI & SHIFT */}
      {activeTab === 'shift' && (
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-[#1a2430]">
                Pengaturan Jam Batas Presensi & Shift
              </h3>
              <p className="mt-0.5 text-[13px] text-[#4b5a6a]">
                Barcode yang discan akan otomatis mencocokkan jadwal shift yang berlaku.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddShift}
              className="dm-btn-primary shrink-0 !py-2"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Shift</span>
            </button>
          </div>

          <Card>
            {shifts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="dm-table w-full">
                  <thead>
                    <tr>
                      <th>ID Shift</th>
                      <th>Nama Shift</th>
                      <th>Jam Mulai</th>
                      <th>Jam Selesai</th>
                      <th>Status</th>
                      <th className="!text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s.idShift}>
                        <td className="whitespace-nowrap font-mono text-[#4b5a6a]">{s.idShift}</td>
                        <td className="whitespace-nowrap font-semibold text-[#1a2430]">{s.namaShift}</td>
                        <td className="whitespace-nowrap font-mono font-semibold text-[#0f4c73]">{s.jamMulai}</td>
                        <td className="whitespace-nowrap font-mono font-semibold text-[#0f4c73]">{s.jamSelesai}</td>
                        <td>
                          <StatusBadge value={s.status} />
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditShift(s)}
                              className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6]"
                              title="Ubah"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShiftToDelete(s)}
                              className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#fdf0f0] hover:text-[#a02a2a]"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Clock className="h-5 w-5" />}
                title="Belum ada shift"
                description="Tambahkan shift pertama untuk mengatur jam presensi."
                action={
                  <button type="button" onClick={handleOpenAddShift} className="dm-btn-primary !py-2">
                    <Plus className="h-4 w-4" />
                    <span>Tambah shift</span>
                  </button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB D: TEMPLATE KARTU PESERTA */}
      {activeTab === 'kartu' && (
        <div className="max-w-4xl space-y-4">
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-[#1a2430]">
              Pengaturan & Upload Template Kartu Peserta
            </h3>
            <p className="mt-0.5 text-[13px] text-[#4b5a6a]">
              Kustomisasi desain kartu peserta dengan mengunggah gambar latar template kustom (JPG/PNG) atau menggunakan preset tema warna resmi.
            </p>
          </Card>

          {/* Mode Pemilihan Desain */}
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-[#1a2430]">
              Pilihan Mode Desain Latar Kartu
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                cardConfig.useCustomTemplate
                  ? 'border-[#0f4c73] bg-[#eef5fb]'
                  : 'border-[#e3e9ef] bg-white'
              }`}>
                <input
                  type="radio"
                  name="cardTemplateMode"
                  checked={!!cardConfig.useCustomTemplate}
                  onChange={() => setCardConfig({ ...cardConfig, useCustomTemplate: true })}
                  className="mt-0.5 accent-[#0f4c73]"
                />
                <div>
                  <span className="block text-[13px] font-semibold text-[#1a2430]">
                    Gunakan Gambar Template Kustom (JPG / PNG)
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-[#4b5a6a]">
                    Unggah gambar desain template buatan Anda sendiri (misal dari Canva/Photoshop).
                  </span>
                </div>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                !cardConfig.useCustomTemplate
                  ? 'border-[#0f4c73] bg-[#eef5fb]'
                  : 'border-[#e3e9ef] bg-white'
              }`}>
                <input
                  type="radio"
                  name="cardTemplateMode"
                  checked={!cardConfig.useCustomTemplate}
                  onChange={() => setCardConfig({ ...cardConfig, useCustomTemplate: false })}
                  className="mt-0.5 accent-[#0f4c73]"
                />
                <div>
                  <span className="block text-[13px] font-semibold text-[#1a2430]">
                    Gunakan Preset Tema Warna Sistem
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-[#4b5a6a]">
                    Gunakan desain modern bawaan dengan palet warna resmi Digitalmeera.
                  </span>
                </div>
              </label>
            </div>
          </Card>

          {/* Area Upload Gambar Template Kartu (JPG / PNG) */}
          <Card className="p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[13px] font-semibold text-[#1a2430]">
                Unggah File Template Kartu (JPG / PNG)
              </h3>
              <span className="text-[12px] text-[#8494a5]">
                Rasio ID-1: 85,60 mm &times; 53,98 mm (~1012 &times; 638 px)
              </span>
            </div>

            {cardConfig.templateImage ? (
              <div className="mt-3 space-y-3">
                <div className="relative aspect-[85.6/53.98] w-full max-w-md overflow-hidden rounded-lg border border-[#e3e9ef]">
                  <img
                    src={cardConfig.templateImage}
                    alt="Template Kartu"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute right-2 top-2 rounded-md bg-[#1a2430] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Template Aktif
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="dm-btn-secondary cursor-pointer !py-2">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{templateUploading ? 'Memproses...' : 'Ganti Gambar Template'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleUploadTemplate}
                      disabled={templateUploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setCardConfig({
                        ...cardConfig,
                        templateImage: '',
                        useCustomTemplate: false,
                      });
                      showToast('Template gambar kustom dihapus.');
                    }}
                    className="dm-btn-secondary !border-[#e3e9ef] !py-2 hover:!bg-[#fdf0f0] hover:!text-[#a02a2a]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Template Kustom</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-3 flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#e3e9ef] bg-[#f7f9fb] p-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#eef5fb] text-[#0f4c73]">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <span className="text-[13px] font-semibold text-[#1a2430]">
                  {templateUploading ? 'Memproses gambar...' : 'Klik untuk Unggah Gambar Template Kartu'}
                </span>
                <span className="mt-1 max-w-sm text-[12px] text-[#4b5a6a]">
                  Format gambar yang didukung: <strong>JPG, JPEG, PNG</strong> (Maksimal 8 MB). Disarankan rasio standar kartu 1.586 : 1.
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleUploadTemplate}
                  disabled={templateUploading}
                  className="hidden"
                />
              </label>
            )}
          </Card>

          {/* Pengaturan Tambahan: Preset Tema (Bila tidak menggunakan template kustom) */}
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-[#1a2430]">
              Pilihan Tema Warna (Mode Standar / Fallback)
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                  Pilih Palet Tema Kartu
                </label>
                <select
                  value={cardConfig.theme}
                  onChange={(e) => setCardConfig({ ...cardConfig, theme: e.target.value as any })}
                  className="dm-input"
                >
                  <option value="modern-navy">Modern Navy (Slate & Sky Blue)</option>
                  <option value="emerald-green">Emerald Green (Deep Green & Mint)</option>
                  <option value="royal-indigo">Royal Indigo (Deep Indigo & Violet)</option>
                  <option value="crimson-amber">Crimson Amber (Deep Red & Warm Gold)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                  Format Kode Siswa Pada Kartu
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-[#e3e9ef] bg-[#f7f9fb] px-3 py-2 text-[13px] text-[#1a2430]">
                  <QrCodeIcon className="h-4 w-4 shrink-0 text-[#0f4c73]" />
                  <span className="font-medium">QR Code 1:1 di sisi kanan kartu (Aktif)</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Pratinjau Langsung (Live Preview) Kartu Siswa */}
          <Card className="p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[13px] font-semibold text-[#1a2430]">
                Pratinjau Hasil Kartu (Live Preview)
              </h3>
              <span className="text-[12px] text-[#8494a5]">
                Ukuran 85,60 mm &times; 53,98 mm &bull; QR Code 1:1 &bull; Tanpa Harga
              </span>
            </div>

            <div className="mt-3 max-w-md">
              <div
                className={`relative flex aspect-[85.6/53.98] w-full flex-col justify-between overflow-hidden rounded-lg ${
                  cardConfig.theme === 'emerald-green'
                    ? 'bg-[#0e4a38]'
                    : cardConfig.theme === 'royal-indigo'
                    ? 'bg-[#2c3263]'
                    : cardConfig.theme === 'crimson-amber'
                    ? 'bg-[#5c1f1f]'
                    : 'bg-[#0f4c73]'
                } p-3 text-white`}
              >
                {/* Background Kustom jika aktif */}
                {cardConfig.useCustomTemplate && cardConfig.templateImage && (
                  <img
                    src={cardConfig.templateImage}
                    alt="Background Template"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <div className="relative z-10 flex h-full flex-col justify-between">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/20 pb-1 pt-0.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20 text-[9px] font-semibold">
                        DM
                      </div>
                      <div>
                        <h4 className="truncate text-[11px] font-semibold leading-none tracking-wide text-white">
                          {profil.namaLembaga || 'DIGITALMEERA'}
                        </h4>
                        <span className="text-[7px] font-medium uppercase tracking-widest text-white/70">
                          Kartu Peserta Resmi
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-white/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/90">
                      OFFICIAL
                    </span>
                  </div>

                  {/* Body Layout: Foto (Kiri) | Info (Tengah) | QR Code (Kanan 1:1) */}
                  <div className="my-auto flex items-center gap-2.5">
                    <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/30 bg-white/10">
                      <span className="text-xs font-semibold text-white/70">FOTO</span>
                    </div>

                    <div className="min-w-0 flex-1 pr-1">
                      <p className="truncate text-[11px] font-semibold leading-snug text-white">
                        Ahmad Fauzi Pratama
                      </p>
                      <div className="mt-0.5 inline-block">
                        <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[8.5px] font-semibold text-[#0f4c73]">
                          DM0001
                        </span>
                      </div>
                      <div className="mt-1">
                        <p className="text-[6.5px] font-semibold uppercase tracking-wider text-white/70">
                          Program Kelas:
                        </p>
                        <p className="truncate text-[8.5px] font-medium text-white">
                          Microsoft Office Pemula
                        </p>
                      </div>
                      <div className="mt-1">
                        <span className="inline-block rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[7px] font-semibold text-white">
                          Aktif
                        </span>
                      </div>
                    </div>

                    {/* QR Code di Sebelah Kanan (Rasio 1:1) */}
                    <div className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-[#e3e9ef] bg-white p-1">
                      {sampleQrUrl ? (
                        <img
                          src={sampleQrUrl}
                          alt="Contoh QR Code"
                          className="aspect-square h-12 w-12 object-contain"
                        />
                      ) : (
                        <div className="flex aspect-square h-12 w-12 items-center justify-center bg-[#f7f9fb]">
                          <QrCodeIcon className="h-6 w-6 text-[#8494a5]" />
                        </div>
                      )}
                      <span className="mt-0.5 font-mono text-[6.5px] font-semibold tracking-wider text-[#4b5a6a]">
                        SCAN QR
                      </span>
                    </div>
                  </div>

                  <div className="pt-0.5 text-center">
                    <span className="text-[6px] tracking-wider text-white/70">
                      {profil.website || 'digitalmeera.com'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tombol Simpan */}
          <div>
            <button
              type="button"
              onClick={handleSaveCardConfig}
              className="dm-btn-primary"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Pengaturan Kartu</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB E: BACKEND SPREADSHEET URL */}
      {activeTab === 'backend' && (
        <div className="max-w-2xl space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-3 border-b border-[#e3e9ef] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-[#1a2430]">
                  Koneksi Google Spreadsheet & Apps Script
                </h3>
                <p className="mt-0.5 text-[13px] text-[#4b5a6a]">
                  Pusat data real-time menggunakan Google Spreadsheet & Google Drive.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {gasApi.isConnectedToGas() ? (
                  <span className="dm-badge dm-badge-active">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-current" />
                    Terhubung ke Google Cloud
                  </span>
                ) : (
                  <span className="dm-badge dm-badge-muted">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-current" />
                    Mode Offline
                  </span>
                )}
              </div>
            </div>

            {/* Form Input URL GAS */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-[#1a2430]">
                  Google Apps Script Web App URL
                </label>
                <button
                  type="button"
                  onClick={handleResetGasUrl}
                  className="rounded-md p-1 text-[12px] font-semibold text-[#0f4c73] hover:bg-[#eef5fb]"
                >
                  Reset ke URL Resmi
                </button>
              </div>
              <input
                type="text"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfyc.../exec"
                className="dm-input font-mono !text-[12px]"
              />
            </div>

            {/* Tombol Aksi URL */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveGasUrl}
                disabled={testingGas}
                className="dm-btn-primary !py-2"
              >
                <Save className="h-4 w-4" />
                <span>Simpan URL</span>
              </button>

              <button
                type="button"
                onClick={handleTestGas}
                disabled={testingGas}
                className="dm-btn-secondary !py-2"
              >
                {testingGas ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                <span>{testingGas ? 'Menguji Koneksi...' : 'Uji Koneksi'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncingNow}
                className="dm-btn-secondary !py-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncingNow ? 'animate-spin' : ''}`} />
                <span>{syncingNow ? 'Menyinkronkan...' : 'Segarkan Data Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenCodeModal}
                className="dm-btn-secondary !py-2"
              >
                <Code2 className="h-4 w-4" />
                <span>Lihat Source Code.gs</span>
              </button>
            </div>
          </Card>

          {/* Cloud Info Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
                Google Spreadsheet Database
              </h3>
              <p className="mt-1.5 break-all font-mono text-[12px] font-semibold text-[#0f4c73]">
                18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-[#0f4c73] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Buka Google Spreadsheet</span>
              </a>
            </Card>

            <Card className="p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
                Google Drive Storage Folder
              </h3>
              <p className="mt-1.5 break-all font-mono text-[12px] font-semibold text-[#0f4c73]">
                1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo
              </p>
              <a
                href="https://drive.google.com/drive/folders/1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-[#0f4c73] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Buka Google Drive</span>
              </a>
            </Card>
          </div>
        </div>
      )}

      {/* Shift Form Modal */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={editingShift ? 'Edit Shift Presensi' : 'Tambah Shift Baru'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveShift} className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
              Nama Shift
            </label>
            <input
              type="text"
              value={shiftNama}
              onChange={(e) => setShiftNama(e.target.value)}
              placeholder="Contoh: Shift Pagi"
              required
              className="dm-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Jam Mulai
              </label>
              <input
                type="text"
                value={shiftJamMulai}
                onChange={(e) => setShiftJamMulai(e.target.value)}
                placeholder="08:00"
                required
                className="dm-input font-mono"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
                Jam Selesai
              </label>
              <input
                type="text"
                value={shiftJamSelesai}
                onChange={(e) => setShiftJamSelesai(e.target.value)}
                placeholder="10:00"
                required
                className="dm-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#1a2430]">
              Status Shift
            </label>
            <select
              value={shiftStatus}
              onChange={(e) => setShiftStatus(e.target.value as any)}
              className="dm-input"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e3e9ef] pt-3">
            <button
              type="button"
              onClick={() => setShiftModalOpen(false)}
              className="dm-btn-secondary !py-2"
            >
              Batal
            </button>
            <button
              type="submit"
              className="dm-btn-primary !py-2"
            >
              Simpan Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Shift Dialog */}
      <ConfirmDialog
        isOpen={!!shiftToDelete}
        onClose={() => setShiftToDelete(null)}
        onConfirm={handleDeleteShift}
        title="Hapus Shift"
        message={`Apakah Anda yakin ingin menghapus ${shiftToDelete?.namaShift}?`}
        confirmText="Hapus Shift"
        cancelText="Batal"
      />
    </div>
  );
};
