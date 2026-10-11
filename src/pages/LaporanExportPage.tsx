import React, { useState, useEffect } from 'react';
import { Absensi, Peserta, ProfilLembaga, Shift } from '../types';
import { gasApi } from '../services/gasApi';
import { exportAbsensiToExcel, exportPesertaToExcel } from '../lib/exportExcel';
import { exportAbsensiToPdf } from '../lib/exportPdf';
import { PageHeader, Card, EmptyState, StatusBadge } from '../components/ui';
import {
  FileSpreadsheet,
  FileText,
  Users,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

interface LaporanExportPageProps {
  profil: ProfilLembaga;
}

export const LaporanExportPage: React.FC<LaporanExportPageProps> = ({ profil }) => {
  const [activeTab, setActiveTab] = useState<'absensi' | 'peserta'>('absensi');
  const [absensiList, setAbsensiList] = useState<Absensi[]>(() => gasApi.getLocalAbsensi());
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => gasApi.getLocalPeserta().filter((p) => p.statusPeserta !== 'Deleted'));
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters Periode
  const [periode, setPeriode] = useState<string>('bulan-ini');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Other Filters
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const [aRes, pRes, sRes] = await Promise.all([
        gasApi.getAbsensi(),
        gasApi.getPeserta(),
        gasApi.getShifts(),
      ]);
      if (aRes.success && aRes.data) setAbsensiList(aRes.data);
      if (pRes.success && pRes.data) setPesertaList(pRes.data.filter((p) => p.statusPeserta !== 'Deleted'));
      if (sRes.success && sRes.data) setShifts(sRes.data);
    } catch (err) {
      console.error('Fetch report data error', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSync = () => {
      fetchData();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
    };
  }, []);

  // Compute date range based on period selection
  const getDateRangeForPeriod = (p: string) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (p === 'hari-ini') {
      return { start: todayStr, end: todayStr, label: 'Hari Ini' };
    }
    if (p === 'kemarin') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      return { start: yStr, end: yStr, label: 'Kemarin' };
    }
    if (p === 'minggu-ini') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Senin
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().slice(0, 10),
        end: sunday.toISOString().slice(0, 10),
        label: 'Minggu Ini',
      };
    }
    if (p === 'bulan-ini') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return { start, end, label: 'Bulan Ini' };
    }
    if (p === 'bulan-lalu') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { start, end, label: 'Bulan Lalu' };
    }
    if (p === 'custom') {
      return {
        start: startDate || todayStr,
        end: endDate || todayStr,
        label: `${startDate || todayStr} s/d ${endDate || todayStr}`,
      };
    }

    return { start: '', end: '', label: 'Semua Waktu' };
  };

  const currentRange = getDateRangeForPeriod(periode);

  // Filter Absensi
  const filteredAbsensi = absensiList.filter((item) => {
    if (currentRange.start && item.tanggal < currentRange.start) return false;
    if (currentRange.end && item.tanggal > currentRange.end) return false;
    if (filterProgram !== 'all' && !item.programKelas.includes(filterProgram)) return false;
    if (filterShift !== 'all' && item.shift !== filterShift) return false;
    if (filterStatus !== 'all' && item.statusPresensi !== filterStatus) return false;
    return true;
  });

  // Filter Peserta
  const filteredPeserta = pesertaList.filter((item) => {
    if (filterProgram !== 'all' && !item.programKelas.includes(filterProgram)) return false;
    if (filterStatus !== 'all' && item.statusPeserta !== filterStatus) return false;
    return true;
  });

  // Export handlers
  const handleExportAbsensiExcel = () => {
    exportAbsensiToExcel(filteredAbsensi, `Laporan_Absensi_${currentRange.label.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportAbsensiPdf = () => {
    exportAbsensiToPdf(filteredAbsensi, profil, currentRange.label);
  };

  const handleExportPesertaExcel = () => {
    exportPesertaToExcel(filteredPeserta, 'Data_Peserta_Digitalmeera.xlsx');
  };

  const periodeOptions = [
    { id: 'hari-ini', label: 'Hari ini' },
    { id: 'kemarin', label: 'Kemarin' },
    { id: 'minggu-ini', label: 'Minggu ini' },
    { id: 'bulan-ini', label: 'Bulan ini' },
    { id: 'bulan-lalu', label: 'Bulan lalu' },
    { id: 'custom', label: 'Rentang khusus' },
  ];

  void loading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Laporan & Export Data"
        description="Rekap kehadiran dan data peserta dalam format Excel (.xlsx) dan PDF."
        actions={
          <button type="button" onClick={fetchData} disabled={isSyncing} className="dm-btn-secondary !py-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan…' : 'Segarkan'}</span>
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e3e9ef]">
        <button
          type="button"
          onClick={() => setActiveTab('absensi')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
            activeTab === 'absensi'
              ? 'border-[#0f4c73] text-[#0f4c73]'
              : 'border-transparent text-[#8494a5] hover:text-[#1a2430]'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Laporan kehadiran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('peserta')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
            activeTab === 'peserta'
              ? 'border-[#0f4c73] text-[#0f4c73]'
              : 'border-transparent text-[#8494a5] hover:text-[#1a2430]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Data peserta</span>
        </button>
      </div>

      {/* TAB 1: ABSENSI */}
      {activeTab === 'absensi' && (
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
              Filter laporan
            </h3>

            {/* Periode Buttons */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-[#4b5a6a]">
                Periode
              </label>
              <div className="flex flex-wrap gap-1.5">
                {periodeOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriode(p.id)}
                    className={
                      periode === p.id
                        ? 'dm-btn-primary !px-3 !py-1.5 !text-[12px]'
                        : 'dm-btn-secondary !px-3 !py-1.5 !text-[12px]'
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker */}
            {periode === 'custom' && (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <span className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">Mulai</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="dm-input !w-auto"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">Sampai</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="dm-input !w-auto"
                  />
                </div>
              </div>
            )}

            {/* Program, Shift, Status Dropdowns */}
            <div className="grid grid-cols-1 gap-2 border-t border-[#e3e9ef] pt-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">Program kelas</label>
                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="dm-input"
                >
                  <option value="all">Semua program</option>
                  <option value="Office Pemula">Paket Office Pemula</option>
                  <option value="Office + Desain">Paket Office + Desain</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">Shift</label>
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

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#4b5a6a]">Status kehadiran</label>
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
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e3e9ef] pt-3">
              <span className="text-[12px] tabular-nums text-[#4b5a6a]">
                {filteredAbsensi.length} rekaman · Periode: {currentRange.label}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAbsensiExcel}
                  disabled={filteredAbsensi.length === 0}
                  className="dm-btn-secondary !py-2 disabled:opacity-40"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAbsensiPdf}
                  disabled={filteredAbsensi.length === 0}
                  className="dm-btn-primary !py-2 disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Table Preview */}
          <Card>
            <div className="flex items-center justify-between border-b border-[#e3e9ef] px-4 py-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
                Pratinjau laporan
              </h4>
              <span className="text-[12px] text-[#8494a5]">Periode: {currentRange.label}</span>
            </div>

            {filteredAbsensi.length > 0 ? (
              <div className="max-h-96 overflow-x-auto">
                <table className="dm-table w-full">
                  <thead className="sticky top-0">
                    <tr>
                      <th>No</th>
                      <th>Tanggal</th>
                      <th>Jam</th>
                      <th>Nomor murid</th>
                      <th>Nama peserta</th>
                      <th>Program</th>
                      <th>Shift</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAbsensi.map((item, idx) => (
                      <tr key={item.idAbsensi || idx}>
                        <td className="font-mono tabular-nums text-[#8494a5]">{idx + 1}</td>
                        <td className="whitespace-nowrap text-[#4b5a6a]">{item.tanggal}</td>
                        <td className="whitespace-nowrap font-mono text-[#1a2430]">{item.waktu}</td>
                        <td className="whitespace-nowrap">
                          <span className="dm-badge dm-badge-id">{item.nomorMurid}</span>
                        </td>
                        <td className="whitespace-nowrap font-semibold text-[#1a2430]">{item.namaPeserta}</td>
                        <td className="whitespace-nowrap text-[#4b5a6a]">{item.programKelas}</td>
                        <td className="whitespace-nowrap">
                          <span className="dm-badge dm-badge-muted">{item.shift}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <StatusBadge value={item.statusPresensi} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<ClipboardList className="h-5 w-5" />}
                title="Tidak ada data"
                description="Tidak ada data presensi pada parameter filter yang dipilih."
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: DATA PESERTA */}
      {activeTab === 'peserta' && (
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1a2430]">
                  Laporan master data peserta
                </h3>
                <p className="mt-0.5 text-[13px] text-[#4b5a6a]">
                  Export biodata, nomor murid, dan kontak wali.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportPesertaExcel}
                disabled={filteredPeserta.length === 0}
                className="dm-btn-primary !py-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel peserta</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#e3e9ef] pt-3">
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="dm-input !w-60"
              >
                <option value="all">Semua program kelas</option>
                <option value="Office Pemula">Paket Office Pemula</option>
                <option value="Office + Desain">Paket Office + Desain</option>
              </select>

              <span className="text-[12px] tabular-nums text-[#4b5a6a]">
                {filteredPeserta.length} peserta terdaftar
              </span>
            </div>
          </Card>

          {/* Table Preview */}
          <Card>
            {filteredPeserta.length > 0 ? (
              <div className="max-h-96 overflow-x-auto">
                <table className="dm-table w-full">
                  <thead className="sticky top-0">
                    <tr>
                      <th>No</th>
                      <th>Nomor murid</th>
                      <th>Nama peserta</th>
                      <th>Program</th>
                      <th>No. WA</th>
                      <th>Orang tua/wali</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeserta.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="font-mono tabular-nums text-[#8494a5]">{idx + 1}</td>
                        <td className="whitespace-nowrap">
                          <span className="dm-badge dm-badge-id">{item.nomorMurid}</span>
                        </td>
                        <td className="whitespace-nowrap font-semibold text-[#1a2430]">{item.namaPeserta}</td>
                        <td className="whitespace-nowrap text-[#4b5a6a]">{item.programKelas}</td>
                        <td className="whitespace-nowrap font-mono tabular-nums text-[#4b5a6a]">{item.nomorWA}</td>
                        <td className="whitespace-nowrap text-[#4b5a6a]">{item.orangTua}</td>
                        <td className="whitespace-nowrap">
                          <StatusBadge value={item.statusPeserta} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="Belum ada data peserta"
                description="Belum ada data peserta yang cocok dengan filter."
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
