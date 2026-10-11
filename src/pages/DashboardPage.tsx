import React, { useState, useEffect } from 'react';
import { Users, ClipboardCheck, UserPlus, QrCode, CreditCard, FileSpreadsheet, ArrowRight, RefreshCw, ClipboardList } from 'lucide-react';
import { gasApi } from '../services/gasApi';
import { DashboardStats } from '../types';
import { ActivePage } from '../components/Sidebar';
import { PageHeader, Card, Toast, EmptyState } from '../components/ui';

interface DashboardPageProps {
  onNavigate: (page: ActivePage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('digitalmeera_dashboard_cache');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return { totalPeserta: 0, paketOfficePemula: 0, paketOfficeDesain: 0, absensiHariIni: 0, tidakHadirHariIni: 0, totalAbsensi: 0, recentAbsensi: [] };
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchStats = async (isManual = false) => {
    setIsSyncing(true);
    try {
      const res = await gasApi.syncAll(isManual);
      if (res.success && res.data?.dashboard) {
        setStats(res.data.dashboard);
        if (isManual) showToast(`Data disegarkan. ${res.data.dashboard.totalPeserta} peserta.`);
      } else {
        const dRes = await gasApi.getDashboard();
        if (dRes.success && dRes.data) {
          setStats(dRes.data);
          if (isManual) showToast('Dashboard dimuat.');
        } else if (isManual) {
          showToast(res.message || 'Gagal menyegarkan data.');
        }
      }
    } catch (err: any) {
      if (isManual) showToast(`Gagal: ${err.message || 'koneksi error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleSync = () => fetchStats();
    window.addEventListener('storage', handleSync);
    window.addEventListener('peserta_updated', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('digitalmeera_sync');
        channel.onmessage = () => fetchStats();
      } catch {}
    }
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('peserta_updated', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
      channel?.close();
    };
  }, []);

  const pct = stats.totalPeserta > 0 ? Math.round((stats.absensiHariIni / stats.totalPeserta) * 100) : 0;

  const metrics = [
    { label: 'Total peserta', value: stats.totalPeserta, sub: `${stats.paketOfficePemula} pemula · ${stats.paketOfficeDesain} desain`, icon: Users },
    { label: 'Hadir hari ini', value: stats.absensiHariIni, sub: `${pct}% dari total`, icon: ClipboardCheck },
    { label: 'Belum hadir', value: stats.tidakHadirHariIni, sub: 'Perlu follow-up', icon: ClipboardList },
    { label: 'Total presensi', value: stats.totalAbsensi, sub: 'Seluruh record', icon: QrCode },
  ];

  const quick = [
    { label: 'Catat absensi', hint: 'Buka scanner', icon: QrCode, page: 'absensi' as ActivePage },
    { label: 'Tambah peserta', hint: 'Pendaftaran baru', icon: UserPlus, page: 'peserta' as ActivePage },
    { label: 'Kartu peserta', hint: 'Cetak & unduh', icon: CreditCard, page: 'kartu' as ActivePage },
    { label: 'Laporan', hint: 'Excel & PDF', icon: FileSpreadsheet, page: 'laporan' as ActivePage },
  ];

  return (
    <div className="space-y-4">
      <Toast message={toastMessage} />
      <PageHeader
        title="Dashboard"
        description="Ringkasan peserta dan kehadiran hari ini."
        actions={
          <button type="button" onClick={() => fetchStats(true)} disabled={isSyncing} className="dm-btn-secondary !py-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan…' : 'Segarkan'}</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5a6a]">{m.label}</span>
              <m.icon className="h-4 w-4 text-[#8494a5]" />
            </div>
            <p className="mt-2 text-[26px] font-semibold tabular-nums leading-none text-[#1a2430]">{m.value}</p>
            <p className="mt-1 text-[12px] text-[#4b5a6a]">{m.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <p className="text-[13px] font-semibold text-[#1a2430]">Kehadiran hari ini</p>
          <p className="mt-0.5 text-[12px] text-[#4b5a6a]">{stats.absensiHariIni} dari {stats.totalPeserta} peserta sudah presensi.</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#eef1f4]">
            <div className="h-full rounded-full bg-[#0f4c73]" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <p className="mt-2 text-[12px] font-semibold tabular-nums text-[#1a2430]">{pct}% hadir</p>
        </Card>
        <Card className="p-4 lg:col-span-2">
          <p className="text-[13px] font-semibold text-[#1a2430]">Aksi cepat</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => onNavigate(q.page)}
                className="flex items-center gap-3 rounded-md border border-[#e3e9ef] p-3 text-left hover:bg-[#f7f9fb]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef5fb] text-[#0f4c73]">
                  <q.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-[#1a2430]">{q.label}</span>
                  <span className="block text-[11px] text-[#8494a5]">{q.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-[#e3e9ef] px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-[#1a2430]">Presensi terbaru</p>
            <p className="text-[12px] text-[#8494a5]">5 record terakhir</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('monitoring')}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0f4c73] hover:underline"
          >
            <span>Lihat semua</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {stats.recentAbsensi && stats.recentAbsensi.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="dm-table w-full">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>No. Murid</th>
                  <th>Nama</th>
                  <th>Shift</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAbsensi.map((item: any, idx) => (
                  <tr key={item.idAbsensi || item['ID Absensi'] || idx}>
                    <td className="whitespace-nowrap tabular-nums text-[#4b5a6a]">
                      {item.tanggal || item.Tanggal} {item.waktu || item.Waktu}
                    </td>
                    <td className="whitespace-nowrap font-mono font-semibold text-[#0f4c73]">
                      {item.nomorMurid || item['Nomor Murid']}
                    </td>
                    <td className="font-medium">{item.namaPeserta || item['Nama Peserta']}</td>
                    <td>{item.shift || item.Shift}</td>
                    <td><span className="dm-badge dm-badge-active">{item.statusPresensi || item['Status Presensi']}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Belum ada presensi"
            description="Gunakan menu Absensi untuk mulai mencatat kehadiran."
          />
        )}
      </Card>
    </div>
  );
};
