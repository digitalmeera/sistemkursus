import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { Peserta } from '../types';
import { gasApi } from '../services/gasApi';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormPesertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pesertaToEdit?: Peserta | null;
  onSuccess: (msg: string) => void;
}

export const FormPesertaModal: React.FC<FormPesertaModalProps> = ({
  isOpen,
  onClose,
  pesertaToEdit,
  onSuccess,
}) => {
  const isEditMode = !!pesertaToEdit;

  // Form State
  const [foto, setFoto] = useState<string>('');
  const [nomorMurid, setNomorMurid] = useState<string>('');
  const [namaPeserta, setNamaPeserta] = useState<string>('');
  const [tempatLahir, setTempatLahir] = useState<string>('');
  const [tanggalLahir, setTanggalLahir] = useState<string>('');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [agama, setAgama] = useState<string>('Islam');
  const [customAgama, setCustomAgama] = useState<string>('');
  const [status, setStatus] = useState<string>('Siswa SD/MI');
  const [nomorWA, setNomorWA] = useState<string>('');
  const [orangTua, setOrangTua] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [programKelas, setProgramKelas] = useState<string>('Paket Office Pemula');
  const [hargaProgram, setHargaProgram] = useState<string>('Rp300.000');
  const [statusPeserta, setStatusPeserta] = useState<'Aktif' | 'Nonaktif' | 'Alumni'>('Aktif');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Update Harga otomatis saat program berubah
  useEffect(() => {
    if (programKelas.includes('Desain')) {
      setHargaProgram('Rp400.000');
    } else {
      setHargaProgram('Rp300.000');
    }
  }, [programKelas]);

  // Load existing data jika Edit Mode, atau generate nomor preview jika Tambah
  useEffect(() => {
    if (!isOpen) return;

    if (pesertaToEdit) {
      setFoto(pesertaToEdit.foto || '');
      setNomorMurid(pesertaToEdit.nomorMurid);
      setNamaPeserta(pesertaToEdit.namaPeserta);
      setTempatLahir(pesertaToEdit.tempatLahir);
      setTanggalLahir(pesertaToEdit.tanggalLahir);
      setJenisKelamin(pesertaToEdit.jenisKelamin);

      const standardAgama = ['Islam', 'Kristen', 'Hindu', 'Budha', 'Konghucu'];
      if (standardAgama.includes(pesertaToEdit.agama)) {
        setAgama(pesertaToEdit.agama);
        setCustomAgama('');
      } else {
        setAgama('Lainnya');
        setCustomAgama(pesertaToEdit.agama);
      }

      setStatus(pesertaToEdit.status);
      setNomorWA(pesertaToEdit.nomorWA);
      setOrangTua(pesertaToEdit.orangTua);
      setAlamat(pesertaToEdit.alamat);
      setProgramKelas(pesertaToEdit.programKelas);
      setHargaProgram(pesertaToEdit.hargaProgram);
      setStatusPeserta((pesertaToEdit.statusPeserta as any) || 'Aktif');
    } else {
      // Tambah baru: reset form
      setFoto('');
      setNomorMurid('[Dibuat Otomatis: DM000X]');
      setNamaPeserta('');
      setTempatLahir('');
      setTanggalLahir('');
      setJenisKelamin('Laki-laki');
      setAgama('Islam');
      setCustomAgama('');
      setStatus('Siswa SD/MI');
      setNomorWA('');
      setOrangTua('');
      setAlamat('');
      setProgramKelas('Paket Office Pemula');
      setHargaProgram('Rp300.000');
      setStatusPeserta('Aktif');
    }
    setErrorMsg('');
  }, [isOpen, pesertaToEdit]);

  // Handle Photo Upload dengan Kompresi Otomatis (Ultra Cepat & Ringan)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Format foto harus berupa JPG, JPEG, atau PNG.');
      return;
    }

    // Validasi ukuran (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFoto(compressedDataUrl);
        } else {
          setFoto(evt.target?.result as string);
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Validasi dan Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi Wajib
    if (!namaPeserta.trim()) {
      setErrorMsg('Nama Peserta wajib diisi.');
      return;
    }
    if (!tempatLahir.trim()) {
      setErrorMsg('Tempat Lahir wajib diisi.');
      return;
    }
    if (!tanggalLahir) {
      setErrorMsg('Tanggal Lahir wajib diisi.');
      return;
    }
    if (!jenisKelamin) {
      setErrorMsg('Jenis Kelamin wajib dipilih.');
      return;
    }

    const finalAgama = agama === 'Lainnya' ? customAgama.trim() : agama;
    if (!finalAgama) {
      setErrorMsg('Agama wajib diisi.');
      return;
    }

    if (!status) {
      setErrorMsg('Status peserta wajib dipilih.');
      return;
    }

    // Validasi nomor WA
    const cleanWA = nomorWA.replace(/[^0-9]/g, '');
    if (cleanWA.length < 9) {
      setErrorMsg('Nomor WA/Telpon minimal 9 digit angka.');
      return;
    }

    if (!orangTua.trim()) {
      setErrorMsg('Nama Orang Tua / Wali wajib diisi.');
      return;
    }
    if (!alamat.trim()) {
      setErrorMsg('Alamat tempat tinggal wajib diisi.');
      return;
    }
    if (!programKelas) {
      setErrorMsg('Program Kelas wajib dipilih.');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && pesertaToEdit) {
        // UPDATE
        const res = await gasApi.updatePeserta({
          ...pesertaToEdit,
          foto,
          namaPeserta: namaPeserta.trim(),
          tempatLahir: tempatLahir.trim(),
          tanggalLahir,
          jenisKelamin,
          agama: finalAgama,
          status,
          nomorWA: nomorWA.trim(),
          orangTua: orangTua.trim(),
          alamat: alamat.trim(),
          programKelas,
          hargaProgram,
          statusPeserta,
        });

        if (res.success) {
          onSuccess('Data peserta berhasil diperbarui.');
          onClose();
        } else {
          setErrorMsg(res.message || 'Gagal memperbarui data peserta.');
        }
      } else {
        // CREATE
        const res = await gasApi.createPeserta({
          foto,
          namaPeserta: namaPeserta.trim(),
          tempatLahir: tempatLahir.trim(),
          tanggalLahir,
          jenisKelamin,
          agama: finalAgama,
          status,
          nomorWA: nomorWA.trim(),
          orangTua: orangTua.trim(),
          alamat: alamat.trim(),
          programKelas,
          hargaProgram,
          tanggalPendaftaran: new Date().toISOString().slice(0, 10),
          statusPeserta: 'Aktif',
        });

        if (res.success) {
          onSuccess(res.message || 'Data peserta berhasil ditambahkan ke Google Spreadsheet!');
          onClose();
        } else {
          setErrorMsg(res.message || 'Gagal menambahkan peserta ke Google Spreadsheet.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Data Peserta Kursus' : 'Pendaftaran Peserta Baru'}
      subtitle={isEditMode ? `Nomor Murid: ${nomorMurid}` : 'Lengkapi seluruh data pendaftaran peserta Digitalmeera'}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-[#f0c9c9] bg-[#fdf0f0] p-3 text-[#a02a2a]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-[12px] font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Section 1: Foto Siswa & Nomor Murid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border border-[#e3e9ef] bg-white p-4">
          {/* Foto Preview & Upload */}
          <div className="sm:col-span-1 flex flex-col items-center">
            <span className="text-[12px] font-semibold text-[#1a2430] mb-2">
              Foto Siswa
            </span>
            <div className="relative h-32 w-28 overflow-hidden rounded-md border border-[#e3e9ef] bg-white flex items-center justify-center">
              {foto ? (
                <>
                  <img src={foto} alt="Preview Foto" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFoto('')}
                    className="absolute top-1 right-1 rounded-full border border-[#e3e9ef] bg-white p-1 text-[#1a2430]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-center p-2 text-[#8494a5]">
                  <Upload className="mx-auto h-6 w-6 mb-1" />
                  <span className="text-[10px] leading-tight block">Upload Foto JPG/PNG</span>
                </div>
              )}
            </div>

            <label className="dm-btn-secondary mt-2.5 cursor-pointer">
              Pilih Foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-[#4b5a6a] mt-1">Maks. 2MB (Opsional)</span>
          </div>

          {/* Nomor Murid (Otomatis & Read-Only) */}
          <div className="sm:col-span-2 space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#1a2430]">
                Nomor Murid
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={nomorMurid}
                  disabled
                  className="dm-input mt-1 font-mono"
                />
              </div>
              <p className="text-[11px] text-[#4b5a6a] mt-1">
                {isEditMode
                  ? 'Nomor murid permanen dan tidak dapat diubah.'
                  : 'Nomor murid dibuat otomatis oleh backend (contoh: DM0001, DM0002).'}
              </p>
            </div>

            {/* Nama Peserta */}
            <div>
              <label className="text-[12px] font-semibold text-[#1a2430]">
                Nama Lengkap Peserta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={namaPeserta}
                onChange={(e) => setNamaPeserta(e.target.value)}
                placeholder="Contoh: Muhammad Farhan"
                required
                className="dm-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Informasi Kelahiran & Identitas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border border-[#e3e9ef] bg-white p-4">
          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Tempat Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tempatLahir}
              onChange={(e) => setTempatLahir(e.target.value)}
              placeholder="Contoh: Jakarta"
              required
              className="dm-input mt-1"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Tanggal Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={tanggalLahir}
              onChange={(e) => setTanggalLahir(e.target.value)}
              required
              className="dm-input mt-1"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Jenis Kelamin <span className="text-red-500">*</span>
            </label>
            <select
              value={jenisKelamin}
              onChange={(e) => setJenisKelamin(e.target.value as any)}
              className="dm-input mt-1"
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Agama <span className="text-red-500">*</span>
            </label>
            <select
              value={agama}
              onChange={(e) => setAgama(e.target.value)}
              className="dm-input mt-1"
            >
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen</option>
              <option value="Hindu">Hindu</option>
              <option value="Budha">Budha</option>
              <option value="Konghucu">Konghucu</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            {agama === 'Lainnya' && (
              <input
                type="text"
                value={customAgama}
                onChange={(e) => setCustomAgama(e.target.value)}
                placeholder="Tuliskan agama..."
                required
                className="dm-input mt-2"
              />
            )}
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Status Peserta / Pendidikan <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="dm-input mt-1"
            >
              <option value="Siswa SD/MI">Siswa SD/MI</option>
              <option value="Siswa SMP/MTs">Siswa SMP/MTs</option>
              <option value="Siswa SMA/MA">Siswa SMA/MA</option>
              <option value="Umum">Umum</option>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Nomor WhatsApp / Telpon <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={nomorWA}
              onChange={(e) => setNomorWA(e.target.value)}
              placeholder="Contoh: 081234567890"
              required
              className="dm-input mt-1"
            />
          </div>
        </div>

        {/* Section 3: Orang Tua & Alamat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border border-[#e3e9ef] bg-white p-4">
          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Nama Orang Tua / Wali <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orangTua}
              onChange={(e) => setOrangTua(e.target.value)}
              placeholder="Nama ayah/ibu/wali"
              required
              className="dm-input mt-1"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Status Keanggotaan
            </label>
            <select
              value={statusPeserta}
              onChange={(e) => setStatusPeserta(e.target.value as any)}
              className="dm-input mt-1"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[12px] font-semibold text-[#1a2430]">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat rumah lengkap..."
              required
              className="dm-input mt-1"
            />
          </div>
        </div>

        {/* Section 4: Program Kelas & Biaya Otomatis */}
        <div className="rounded-md border border-[#e3e9ef] bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold text-[#1a2430]">
                Pilih Program Kelas <span className="text-red-500">*</span>
              </label>
              <select
                value={programKelas}
                onChange={(e) => setProgramKelas(e.target.value)}
                className="dm-input mt-1"
              >
                <option value="Paket Office Pemula">Paket Office Pemula</option>
                <option value="Paket Office + Desain">Paket Office + Desain</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#1a2430]">
                Biaya Program (Otomatis)
              </label>
              <input
                type="text"
                value={hargaProgram}
                readOnly
                className="dm-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e3e9ef]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="dm-btn-secondary"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="dm-btn-primary"
          >
            {loading ? (
              <span>Menyimpan ke Spreadsheet...</span>
            ) : (
              <span>{isEditMode ? 'Simpan Perubahan' : 'Daftarkan Peserta'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
