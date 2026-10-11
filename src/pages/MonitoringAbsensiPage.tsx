import React, { useState, useEffect } from 'react';
import { Absensi, Shift } from '../types';
import { gasApi } from '../services/gasApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader, Card, Toast, EmptyState, StatusBadge } from '../components/ui';
import {
  ClipboardList,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const MonitoringAbsensiPage: React.FC = () => {
  const [absensiList, setAbsensiList] = useState<Absensi[]>(() => gasApi.getLocalAbsensi());
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<Absensi | null>(null);
  const [editWaktu, setEditWaktu] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Terlambat'>('Hadir');
  const [editShift, setEditShift] = useState<string>('');
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<Absensi | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string>('');

  const fetchAbsensi = async () => {
    setIsSyncing(true);
    try {
      const [aRes, sRes] = await Promise.all([
        gasApi.getAbsensi(),
        gasApi.getShifts(),
      ]);
      if (aRes.success && aRes.data) {
        setAbsensiList(aRes.data);
      }
      if (sRes.success && sRes.data) {
        setShifts(sRes.data);
      }
    } catch (err) {
      console.error('Failed to load absensi monitoring', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsensi();

    const handleSync = () => {
      fetchAbsensi();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenEdit = (item: Absensi) => {
    setEditingItem(item);
    setEditWaktu(item.waktu);
    setEditStatus(item.statusPresensi as any);
    setEditShift(item.shift);
    setEditKeterangan(item.keterangan || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSavingEdit(true);
    try {
      const res = await gasApi.updateAbsensi(editingItem.idAbsensi, {
        waktu: editWaktu,
        statusPresensi: editStatus,
        shift: editShift,
        keterangan: editKeterangan,
      });

      if (res.success) {
        showToast('Data absensi berhasil diperbarui.');
        setEditingItem(null);
        fetchAbsensi();
      }
    } catch (err) {
      console.error('Update absensi error', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await gasApi.deleteAbsensi(itemToDelete.idAbsensi);
      if (res.success) {
        showToast('Data absensi berhasil dihapus.');
        setItemToDelete(null);
        fetchAbsensi();
      }
    } catch (err) {
      console.error('Delete absensi error', err);
    } finally {
      setDeleting(false);
    }
  };

  // Filter List
  const filtered = absensiList.filter((item) => {
    const matchesSearch =
      item.namaPeserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomorMurid.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !filterDate || item.tanggal === filterDate;
    const matchesStatus = filterStatus === 'all' || item.statusPresensi === filterStatus;
    const matchesShift = filterShift === 'all' || item.shift === filterShift;

    return matchesSearch && matchesDate && matchesStatus && matchesShift;
  });

  const hasActiveFilter =
    searchTerm !== '' || filterDate !== '' || filterStatus !== 'all' || filterShift !== 'all';

  return (
    <div className="space-y-4">
      <Toast message={toastMessage} />

      <PageHeader
        title="Monitoring Absensi"
        description="Pantau rekaman presensi, verifikasi kehadiran, dan koreksi data."
        actions={
          <button
            type="button"
            onClick={fetchAbsensi}
            disabled={isSyncing}
            className="dm-btn-secondary !py-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan…' : 'Segarkan'}</span>
          </button>
        }
      />

      <Card className="p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8494a5]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama peserta / DM000X…"
              className="dm-input !pl-9"
            />
          </div>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="dm-input"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="dm-input"
          >
            <option value="all">Semua status</option>
            <option value="Hadir">Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
            <option value="Terlambat">Terlambat</option>
          </select>

          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="dm-input"
          >
            <option value="all">Semua shift</option>
            {shifts.map((s) => (
              <option key={s.idShift} value={s.namaShift}>
                {s.namaShift}
              </option>
            ))}
          </select>
        </div>

        {filterDate && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-[#e3e9ef] bg-[#f7f9fb] px-3 py-1.5 text-[12px] text-[#4b5a6a]">
            <span>
              Filter tanggal: <strong className="font-semibold text-[#1a2430]">{filterDate}</strong>
            </span>
            <button
              type="button"
              onClick={() => setFilterDate('')}
              className="font-semibold text-[#0f4c73] hover:underline"
            >
              Reset tanggal
            </button>
          </div>
        )}
      </Card>

      <Card>
        {(loading || (isSyncing && absensiList.length === 0)) ? (
          <div className="p-10 text-center text-[13px] text-[#8494a5]">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#4b5a6a]" />
            Memuat data absensi…
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="dm-table w-full">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Nomor murid</th>
                  <th>Nama peserta</th>
                  <th>Program</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Admin</th>
                  <th>Keterangan</th>
                  <th className="!text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.idAbsensi}>
                    <td className="whitespace-nowrap font-mono text-[#4b5a6a]">
                      {item.tanggal} ({item.hari})
                    </td>
                    <td className="whitespace-nowrap font-mono font-semibold text-[#1a2430]">
                      {item.waktu}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="dm-badge dm-badge-id">{item.nomorMurid}</span>
                    </td>
                    <td className="whitespace-nowrap font-semibold text-[#1a2430]">
                      {item.namaPeserta}
                    </td>
                    <td className="whitespace-nowrap text-[#4b5a6a]">
                      {item.programKelas}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="dm-badge dm-badge-muted">{item.shift}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge value={item.statusPresensi} />
                    </td>
                    <td className="whitespace-nowrap text-[#4b5a6a]">
                      {item.admin || 'Admin'}
                    </td>
                    <td className="max-w-xs truncate text-[#4b5a6a]">
                      {item.keterangan || '-'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6]"
                          title="Edit presensi"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#fdf0f0] hover:text-[#a02a2a]"
                          title="Hapus presensi"
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
            icon={<ClipboardList className="h-5 w-5" />}
            title={hasActiveFilter ? 'Tidak ada hasil' : 'Belum ada data absensi'}
            description={
              hasActiveFilter
                ? 'Ubah kata kunci atau filter untuk melihat data lain.'
                : 'Pindai barcode peserta di menu Sistem Absensi untuk mencatat kehadiran.'
            }
          />
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Data Presensi Siswa"
        subtitle={`Siswa: ${editingItem?.namaPeserta} (${editingItem?.nomorMurid})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">
              Waktu presensi (Jam:Menit)
            </label>
            <input
              type="text"
              value={editWaktu}
              onChange={(e) => setEditWaktu(e.target.value)}
              placeholder="08:15"
              required
              className="dm-input font-mono"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">
              Status kehadiran
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              className="dm-input"
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">
              Shift presensi
            </label>
            <select
              value={editShift}
              onChange={(e) => setEditShift(e.target.value)}
              className="dm-input"
            >
              {shifts.map((s) => (
                <option key={s.idShift} value={s.namaShift}>
                  {s.namaShift}
                </option>
              ))}
              <option value="Di Luar Shift">Di Luar Shift</option>
              <option value="Reguler">Reguler</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">
              Keterangan
            </label>
            <input
              type="text"
              value={editKeterangan}
              onChange={(e) => setEditKeterangan(e.target.value)}
              placeholder="Catatan tambahan…"
              className="dm-input"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e3e9ef] pt-3">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="dm-btn-secondary !py-2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="dm-btn-primary !py-2 disabled:opacity-50"
            >
              {savingEdit ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Rekaman Absensi"
        message={`Apakah Anda yakin ingin menghapus data presensi ${itemToDelete?.namaPeserta} pada tanggal ${itemToDelete?.tanggal} pukul ${itemToDelete?.waktu}?`}
        confirmText="Hapus Presensi"
        cancelText="Batal"
        isLoading={deleting}
      />
    </div>
  );
};
