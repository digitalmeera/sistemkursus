import React, { useState, useEffect } from 'react';
import { Peserta, ProfilLembaga, CardTemplateConfig } from '../types';
import { gasApi } from '../services/gasApi';
import { FormPesertaModal } from './FormPesertaModal';
import { DetailPesertaModal } from './DetailPesertaModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader, Card, Toast, EmptyState, StatusBadge, StudentPhoto } from '../components/ui';
import { downloadSingleCardPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { UserPlus, Search, Eye, Edit3, Trash2, FileText, Image as ImageIcon, Users, RefreshCw } from 'lucide-react';

interface PesertaPageProps {
  profil: ProfilLembaga;
}

export const PesertaPage: React.FC<PesertaPageProps> = ({ profil }) => {
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() =>
    gasApi.getLocalPeserta().filter((p) => p.statusPeserta !== 'Deleted')
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<Peserta | null>(null);
  const [detailTarget, setDetailTarget] = useState<Peserta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Peserta | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig | undefined>();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchPeserta = async (isManual = false) => {
    setIsSyncing(true);
    try {
      if (isManual) {
        const syncRes = await gasApi.syncAll(true);
        if (syncRes.success && syncRes.data?.peserta) {
          setPesertaList(syncRes.data.peserta.filter((p) => p.statusPeserta !== 'Deleted'));
          showToast(`Disegarkan. ${syncRes.data.peserta.length} peserta.`);
        } else if (syncRes.message) showToast(syncRes.message);
      } else {
        const [res, cfg] = await Promise.all([gasApi.getPeserta(), gasApi.getCardConfig()]);
        if (res.success && res.data) setPesertaList(res.data.filter((p) => p.statusPeserta !== 'Deleted'));
        setCardConfig(cfg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchPeserta();
    const handleSync = () => fetchPeserta();
    window.addEventListener('storage', handleSync);
    window.addEventListener('peserta_updated', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('digitalmeera_sync');
        channel.onmessage = (msg) => {
          if (['PESERTA_ADDED', 'PESERTA_UPDATED', 'SYNC'].includes(msg.data?.type)) fetchPeserta();
        };
      } catch {}
    }
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('peserta_updated', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
      channel?.close();
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await gasApi.deletePeserta(deleteTarget.id, deleteTarget.nomorMurid);
      if (res.success) {
        showToast('Peserta dihapus permanen dari spreadsheet.');
        setDeleteTarget(null);
        fetchPeserta();
      } else {
        showToast(res.message || 'Gagal menghapus peserta.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredList = pesertaList.filter((p) => {
    const s = searchTerm.toLowerCase().trim();
    const okSearch =
      !s ||
      (p.namaPeserta || '').toLowerCase().includes(s) ||
      (p.nomorMurid || '').toLowerCase().includes(s) ||
      (p.nomorWA || '').includes(s);
    const okProg = filterProgram === 'all' || (p.programKelas || '').includes(filterProgram);
    const okStat = filterStatus === 'all' || p.statusPeserta === filterStatus;
    return okSearch && okProg && okStat;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const paginatedList = filteredList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-4">
      <Toast message={toastMessage} />
      <PageHeader
        title="Data Peserta"
        description={`${filteredList.length} peserta terdaftar.`}
        actions={
          <>
            <button type="button" onClick={() => fetchPeserta(true)} disabled={isSyncing} className="dm-btn-secondary !py-2">
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan…' : 'Segarkan'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setIsFormOpen(true);
              }}
              className="dm-btn-primary !py-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tambah Peserta</span>
            </button>
          </>
        }
      />

      <Card className="p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <div className="relative sm:col-span-1 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8494a5]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, nomor murid, atau WA…"
              className="dm-input !pl-9"
            />
          </div>
          <select
            value={filterProgram}
            onChange={(e) => {
              setFilterProgram(e.target.value);
              setCurrentPage(1);
            }}
            className="dm-input"
          >
            <option value="all">Semua program</option>
            <option value="Office Pemula">Office Pemula</option>
            <option value="Office + Desain">Office + Desain</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="dm-input"
          >
            <option value="all">Semua status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
            <option value="Alumni">Alumni</option>
          </select>
        </div>
      </Card>

      <Card>
        {paginatedList.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="dm-table w-full">
                <thead>
                  <tr>
                    <th>Peserta</th>
                    <th>No. Murid</th>
                    <th>Program</th>
                    <th>Kontak</th>
                    <th>Status</th>
                    <th className="!text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <StudentPhoto src={p.foto} name={p.namaPeserta} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1a2430]">{p.namaPeserta}</p>
                            <p className="text-[11px] text-[#8494a5]">{p.status} · {p.tanggalPendaftaran}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-mono font-semibold text-[#0f4c73]">{p.nomorMurid}</td>
                      <td className="whitespace-nowrap">{p.programKelas}</td>
                      <td className="whitespace-nowrap tabular-nums text-[#4b5a6a]">
                        {p.nomorWA}
                        <span className="block text-[11px] text-[#8494a5]">{p.orangTua}</span>
                      </td>
                      <td>
                        <StatusBadge value={p.statusPeserta} />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-0.5">
                          <button type="button" onClick={() => setDetailTarget(p)} className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6]" title="Detail">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => downloadSingleCardPdf(p, profil, cardConfig)} className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6]" title="Kartu PDF">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => downloadCardAsJpg(p, profil, cardConfig)} className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6]" title="Kartu JPG">
                            <ImageIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(p);
                              setIsFormOpen(true);
                            }}
                            className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6]"
                            title="Ubah"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(p)} className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#fdf0f0] hover:text-[#a02a2a]" title="Hapus">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-2 border-t border-[#e3e9ef] px-4 py-2.5 sm:flex-row">
              <span className="text-[12px] tabular-nums text-[#4b5a6a]">
                {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filteredList.length)} dari {filteredList.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
                  disabled={page === 1}
                  className="dm-btn-secondary !px-2.5 !py-1 !text-[12px] disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="px-1 text-[12px] font-semibold tabular-nums">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))}
                  disabled={page === totalPages}
                  className="dm-btn-secondary !px-2.5 !py-1 !text-[12px] disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={searchTerm ? 'Tidak ada hasil' : 'Belum ada peserta'}
            description={searchTerm ? 'Ubah kata kunci atau filter.' : 'Tambahkan peserta pertama untuk mulai.'}
            action={
              !searchTerm ? (
                <button type="button" onClick={() => setIsFormOpen(true)} className="dm-btn-primary !py-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Tambah peserta</span>
                </button>
              ) : undefined
            }
          />
        )}
      </Card>

      <FormPesertaModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        pesertaToEdit={editTarget}
        onSuccess={(msg) => {
          showToast(msg);
          fetchPeserta();
        }}
      />
      <DetailPesertaModal isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} peserta={detailTarget} profil={profil} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus peserta?"
        message={`Hapus ${deleteTarget?.namaPeserta} (${deleteTarget?.nomorMurid}) permanen dari spreadsheet? Data tidak bisa dikembalikan, tapi nomor murid tidak akan dipakai ulang.`}
        confirmText="Ya, hapus"
        cancelText="Batal"
        isLoading={deleting}
      />
    </div>
  );
};
