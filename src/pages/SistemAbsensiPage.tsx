import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { gasApi } from '../services/gasApi';
import { Absensi, Peserta, Shift } from '../types';
import { sound } from '../lib/sound';
import {
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  Keyboard,
  Clock,
  Volume2,
  RefreshCw,
  ShieldAlert,
  QrCode as QrCodeIcon,
  SwitchCamera
} from 'lucide-react';
import { PageHeader, Card, Toast } from '../components/ui';

export const SistemAbsensiPage: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [selectedShift, setSelectedShift] = useState<string>(() => {
    const local = gasApi.getLocalShifts();
    const nowStr = new Date().toTimeString().slice(0, 5);
    const active = local.find(s => s.status === 'Aktif' && nowStr >= s.jamMulai && nowStr <= s.jamSelesai);
    return active ? active.namaShift : (local[0]?.namaShift || '');
  });
  const [override, setOverride] = useState<boolean>(false);

  // Manual Input fallback
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Last scanned student result display
  const [lastScanResult, setLastScanResult] = useState<{
    peserta?: Peserta;
    absensi?: Absensi;
    message: string;
    isError?: boolean;
    isWarning?: boolean;
    timestamp: string;
  } | null>(null);

  // Recent scans in this session
  const [sessionScans, setSessionScans] = useState<Array<{
    nomorMurid: string;
    nama: string;
    waktu: string;
    status: string;
    shift: string;
  }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const containerId = 'qrcode-reader-viewfinder';

  // Load shifts on mount
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const res = await gasApi.getShifts();
        if (res.success && res.data) {
          setShifts(res.data);
          // Set shift yang aktif saat ini jika ada
          const nowStr = new Date().toTimeString().slice(0, 5);
          const active = res.data.find(
            (s) => s.status === 'Aktif' && nowStr >= s.jamMulai && nowStr <= s.jamSelesai
          );
          if (active) setSelectedShift(active.namaShift);
        }
      } catch (err) {
        console.error('Failed to load shifts', err);
      }
    };
    loadShifts();
  }, []);

  // Initialize Camera Scanner dengan konfigurasi rasio 1:1 untuk QR Code
  const startCameraWithMode = async (mode: 'environment' | 'user') => {
    try {
      setCameraError('');
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {}
      }
      const qrCodeInstance = new Html5Qrcode(containerId);
      html5QrCodeRef.current = qrCodeInstance;

      // Konfigurasi 1:1 bujursangkar untuk QR Code
      const config = {
        fps: 20,
        qrbox: { width: 250, height: 250 }, // Aspek rasio 1:1 bujursangkar
        aspectRatio: 1.0,
      };

      await qrCodeInstance.start(
        { facingMode: mode },
        config,
        (decodedText) => {
          handleBarcodeScanned(decodedText);
        },
        () => {
          // Frame non-match - ignore silently
        }
      );

      setCameraActive(true);
      setCameraFacingMode(mode);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraActive(false);
      setCameraError(
        err.message || 'Izin kamera ditolak atau kamera tidak dapat diakses.'
      );
    }
  };

  const handleFlipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    await startCameraWithMode(nextMode);
    setIsFlipping(false);
  };

  const handleRestartCamera = async () => {
    await startCameraWithMode(cameraFacingMode);
  };

  useEffect(() => {
    startCameraWithMode('environment');

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
      }
    };
  }, []);

  // Core handler for QR code detection (from camera or manual input)
  const handleBarcodeScanned = async (barcodeVal: string) => {
    const cleanVal = barcodeVal.trim();
    if (!cleanVal) return;

    // Cooldown check (2.0 detik) untuk mencegah pemindaian berulang yang tidak disengaja
    const now = Date.now();
    if (
      cleanVal === lastScannedBarcodeRef.current &&
      now - lastScannedTimeRef.current < 2000
    ) {
      return;
    }

    lastScannedBarcodeRef.current = cleanVal;
    lastScannedTimeRef.current = now;

    await processAttendance(cleanVal);
  };

  const processAttendance = async (barcodeVal: string) => {
    setIsProcessing(true);

    try {
      const res = await gasApi.recordAbsensi({
        barcodeValue: barcodeVal,
        shift: selectedShift || undefined,
        statusPresensi: 'Hadir',
        override: override,
      });

      const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (res.success && res.data) {
        // SUKSES
        sound.playSuccess();
        setLastScanResult({
          absensi: res.data,
          message: res.message || 'Presensi berhasil dicatat!',
          timestamp: nowTimeStr,
        });

        // Tambah ke riwayat sesi lokal
        setSessionScans((prev) => [
          {
            nomorMurid: res.data!.nomorMurid,
            nama: res.data!.namaPeserta,
            waktu: res.data!.waktu,
            status: res.data!.statusPresensi,
            shift: res.data!.shift,
          },
          ...prev.slice(0, 9), // simpan 10 terakhir
        ]);
      } else {
        // GAGAL / DUPLIKAT / DI LUAR JAM
        sound.playWarning();
        setLastScanResult({
          message: res.message || 'Presensi tidak dapat dicatat.',
          isError: true,
          isWarning: res.isDuplicate || res.canOverride,
          timestamp: nowTimeStr,
        });
      }
    } catch (err: any) {
      sound.playWarning();
      setLastScanResult({
        message: err.message || 'Terjadi kesalahan sistem saat mencatat absensi.',
        isError: true,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    processAttendance(manualBarcode.trim());
    setManualBarcode('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Absensi"
        description="Arahkan kamera ke QR kartu siswa. Pemindaian berjalan otomatis."
        actions={
          <>
            <span className="flex items-center gap-1.5 rounded-md border border-[#e3e9ef] bg-white px-2.5 py-1.5">
              <Clock className="h-3.5 w-3.5 text-[#4b5a6a]" />
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="cursor-pointer bg-transparent text-[12px] font-semibold text-[#1a2430] focus:outline-none"
              >
                <option value="">Shift otomatis</option>
                {shifts.map((s) => (
                  <option key={s.idShift} value={s.namaShift}>
                    {s.namaShift} ({s.jamMulai}–{s.jamSelesai})
                  </option>
                ))}
              </select>
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#e3e9ef] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#1a2430]">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <span>Override jam</span>
            </label>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <Card className="overflow-hidden">
            <div className="relative flex min-h-[320px] items-center justify-center bg-[#10161d] sm:min-h-[360px]">
              <div id={containerId} className="h-full w-full overflow-hidden" />

              <button
                type="button"
                onClick={handleFlipCamera}
                disabled={isFlipping}
                className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/60 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-black/80 disabled:opacity-50"
                title="Ganti kamera"
              >
                <SwitchCamera className="h-3.5 w-3.5" />
                <span>{cameraFacingMode === 'environment' ? 'Belakang' : 'Depan'}</span>
              </button>

              {cameraActive && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                  <div className="relative flex h-56 w-56 items-center justify-center rounded-md border-2 border-white/80 sm:h-64 sm:w-64">
                    <span className="absolute -bottom-6 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] tracking-wide text-white">
                      Posisikan QR di sini
                    </span>
                  </div>
                </div>
              )}

              {!cameraActive && (
                <div className="z-10 max-w-sm p-8 text-center text-white">
                  <CameraOff className="mx-auto mb-3 h-10 w-10 text-[#8494a5]" />
                  <h4 className="text-[13px] font-semibold">Kamera tidak aktif</h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#8494a5]">
                    {cameraError || 'Browser membutuhkan izin akses kamera.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestartCamera}
                      className="dm-btn-primary !py-2 !text-[12px]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Aktifkan ulang</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="dm-btn-secondary !border-white/20 !bg-white/10 !py-2 !text-[12px] !text-white hover:!bg-white/20"
                    >
                      <SwitchCamera className="h-3.5 w-3.5" />
                      <span>Ganti kamera</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e3e9ef] bg-[#f7f9fb] px-3.5 py-2 text-[12px] text-[#4b5a6a]">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-[#1d6b3a]' : 'bg-[#a02a2a]'}`} />
                <span>{cameraActive ? 'Scanner aktif' : 'Nonaktif'}</span>
              </div>
              <div className="flex items-center gap-1 tabular-nums">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Beep on</span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5">
            <form onSubmit={handleManualSubmit} className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
                <Keyboard className="h-3.5 w-3.5" />
                <span>Input manual / scanner USB</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Ketik nomor murid, mis. DM0001, lalu Enter…"
                  className="dm-input font-mono"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !manualBarcode.trim()}
                  className="dm-btn-primary shrink-0"
                >
                  {isProcessing ? 'Memproses…' : 'Catat'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-3 lg:col-span-5">
          <Card className="p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
              Hasil terakhir
            </p>

            {lastScanResult ? (
              <div
                className={`rounded-md border p-3.5 ${
                  lastScanResult.isError
                    ? lastScanResult.isWarning
                      ? 'border-[#e3cfa3] bg-[#fdf7ec]'
                      : 'border-[#f0c9c9] bg-[#fdf0f0]'
                    : 'border-[#c4e3cf] bg-[#eef7f1]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {lastScanResult.isError ? (
                    lastScanResult.isWarning ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6d1b]" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#a02a2a]" />
                    )
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6b3a]" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-tight text-[#1a2430]">
                      {lastScanResult.message}
                    </p>
                    <span className="mt-0.5 block font-mono text-[11px] text-[#8494a5]">
                      {lastScanResult.timestamp}
                    </span>

                    {lastScanResult.absensi && (
                      <dl className="mt-3 space-y-1.5 border-t border-[#c4e3cf] pt-3 text-[12px]">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-[#4b5a6a]">No. murid</dt>
                          <dd className="font-mono font-semibold text-[#0f4c73]">{lastScanResult.absensi.nomorMurid}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-[#4b5a6a]">Nama</dt>
                          <dd className="max-w-[180px] truncate font-semibold">{lastScanResult.absensi.namaPeserta}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-[#4b5a6a]">Program</dt>
                          <dd>{lastScanResult.absensi.programKelas}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-[#4b5a6a]">Shift / jam</dt>
                          <dd className="tabular-nums">{lastScanResult.absensi.shift} · {lastScanResult.absensi.waktu}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#e3e9ef] bg-[#f7f9fb] p-8 text-center">
                <QrCodeIcon className="mx-auto mb-2 h-8 w-8 text-[#8494a5]" />
                <p className="text-[12px] font-semibold text-[#1a2430]">
                  Belum Ada Pemindaian QR Code
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Scan QR code pada kartu peserta untuk mulai mencatat kehadiran otomatis.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5a6a]">
                Riwayat sesi ({sessionScans.length})
              </p>
              {sessionScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionScans([])}
                  className="text-[11px] text-[#8494a5] hover:text-[#1a2430] hover:underline"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {sessionScans.length > 0 ? (
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                {sessionScans.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-[#eef2f6] bg-[#f7f9fb] p-2 text-[12px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-[#0f4c73]">
                          {item.nomorMurid}
                        </span>
                        <span className="truncate font-semibold text-[#1a2430]">
                          {item.nama}
                        </span>
                      </div>
                      <span className="tabular-nums text-[11px] text-[#8494a5]">
                        {item.shift} · {item.waktu}
                      </span>
                    </div>

                    <span className="dm-badge dm-badge-active ml-2 shrink-0">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-[12px] text-[#8494a5]">
                Riwayat presensi sesi ini akan muncul di sini.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
