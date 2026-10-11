import React, { useState, useEffect } from 'react';
import { Peserta, ProfilLembaga, CardTemplateConfig } from '../types';
import { gasApi } from '../services/gasApi';
import { downloadSingleCardPdf, downloadAllCardsPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { generateQrCodeDataUrl } from '../lib/qrcode';
import { PageHeader, Card, Toast, EmptyState } from '../components/ui';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Search,
  QrCode as QrCodeIcon,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

interface KartuPesertaPageProps {
  profil: ProfilLembaga;
}

// Subcomponent for each student card with 1:1 QR Code and custom template support
const StudentCardItem: React.FC<{
  peserta: Peserta;
  profil: ProfilLembaga;
  cardConfig: CardTemplateConfig;
}> = ({ peserta, profil, cardConfig }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    generateQrCodeDataUrl(peserta.nomorMurid, { size: 240, margin: 1 }).then((url) => {
      if (active) setQrCodeUrl(url);
    });
    return () => {
      active = false;
    };
  }, [peserta.nomorMurid]);

  const hasCustomTemplate = !!(cardConfig.useCustomTemplate && cardConfig.templateImage);

  // Solid navy profesional — tanpa gradient AI slop
  const themeBg = cardConfig.theme === 'emerald-green' ? '#0d3b2e'
    : cardConfig.theme === 'royal-indigo' ? '#1e2a5a'
    : cardConfig.theme === 'crimson-amber' ? '#4a1d1d'
    : '#0f4c73';

  return (
    <div className="flex flex-col rounded-lg border border-[#e3e9ef] bg-white p-3">
      {/* Visual Card (Aspect Ratio ID-1 standard ~85.60 x 53.98 = 1.586) */}
      <div
        className="relative flex aspect-[85.6/53.98] w-full flex-col justify-between overflow-hidden rounded-md p-3 text-white"
        style={{ background: hasCustomTemplate ? '#0b2f47' : themeBg }}
      >
        {/* Background Custom Template if enabled */}
        {hasCustomTemplate && cardConfig.templateImage && (
          <img
            src={cardConfig.templateImage}
            alt="Card Template Background"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
        )}

        {/* Content Overlay */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Header of Card */}
          {!hasCustomTemplate ? (
            <div className="flex items-center justify-between border-b border-white/15 pb-1.5 pt-0.5">
              <div className="flex min-w-0 items-center gap-1.5">
                {profil.logo ? (
                  <img src={profil.logo} alt="Logo" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="h-5 w-5 rounded bg-white/25 object-contain p-0.5" />
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/25 text-[9px] font-semibold">
                    DM
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="truncate text-[11px] font-semibold leading-none text-white">
                    {profil.namaLembaga || 'DIGITALMEERA'}
                  </h4>
                  <span className="text-[7px] font-medium uppercase tracking-wide text-white/70">
                    Kartu Peserta Resmi
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded border border-white/25 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/90">
                Official
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5">
                {profil.logo && (
                  <img src={profil.logo} alt="Logo" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="h-5 w-5 rounded bg-white/40 object-contain p-0.5" />
                )}
                <span className="text-[9px] font-semibold text-white">
                  {profil.namaLembaga || 'DIGITALMEERA'}
                </span>
              </div>
              <span className="rounded border border-white/25 bg-black/40 px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-wide text-white">
                Official
              </span>
            </div>
          )}

          {/* Middle Body Layout: Foto (Kiri) | Info (Tengah) | QR Code 1:1 (Kanan) */}
          <div className="my-auto flex items-center gap-2.5">
            {/* Foto Siswa (Kiri) dengan preview object-cover */}
            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-white/40 bg-white/15 sm:h-[72px] sm:w-14">
              {peserta.foto ? (
                <img
                  src={peserta.foto}
                  alt={peserta.namaPeserta}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-white/70">
                  {peserta.namaPeserta.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Student Info (Tengah) - Tanpa Harga Program */}
            <div className="flex-1 min-w-0 pr-1">
              <p className="truncate text-[11px] font-semibold leading-snug text-white sm:text-[12px]">
                {peserta.namaPeserta}
              </p>

              <div className="mt-0.5 inline-block">
                <span className="rounded bg-white/95 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold text-[#0f4c73] sm:text-[9px]">
                  {peserta.nomorMurid}
                </span>
              </div>

              <div className="mt-1">
                <p className="text-[6.5px] font-semibold uppercase tracking-wide text-white/60">
                  Program Kelas:
                </p>
                <p className="truncate text-[8.5px] font-medium text-white sm:text-[9px]">
                  {peserta.programKelas.replace(/\s*—\s*Rp[\d.,]+/g, '')}
                </p>
              </div>

              <div className="mt-1">
                <span className="inline-block rounded border border-white/30 px-1.5 py-0.5 text-[7px] font-semibold text-white">
                  {peserta.statusPeserta || 'Aktif'}
                </span>
              </div>
            </div>

            {/* QR Code di Sebelah Kanan (Rasio 1:1) */}
            <div className="flex shrink-0 flex-col items-center justify-center rounded-md border border-white/40 bg-white p-1 sm:p-1.5">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${peserta.nomorMurid}`}
                  className="aspect-square h-12 w-12 object-contain sm:h-14 sm:w-14"
                />
              ) : (
                <div className="flex aspect-square h-12 w-12 items-center justify-center bg-[#eef1f4] sm:h-14 sm:w-14">
                  <QrCodeIcon className="h-6 w-6 text-[#8494a5]" />
                </div>
              )}
              <span className="mt-0.5 font-mono text-[6.5px] font-semibold tracking-wide text-[#1a2430]">
                SCAN QR
              </span>
            </div>
          </div>

          {/* Footer Website www.digitalmeera.tech */}
          <div className="pt-0.5 text-center">
            <span className="text-[6.5px] font-medium tracking-wide text-white/70">
              www.digitalmeera.tech
            </span>
          </div>
        </div>
      </div>

      {/* Card Controls */}
      <div className="mt-2.5 flex items-center justify-between border-t border-[#e3e9ef] pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] font-semibold text-[#1a2430]">{peserta.nomorMurid}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => downloadCardAsJpg(peserta, profil, cardConfig)}
            className="dm-btn-secondary !px-2.5 !py-1.5 !text-[12px]"
            title="Download format Gambar JPG (300 DPI)"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>JPG</span>
          </button>

          <button
            type="button"
            onClick={() => downloadSingleCardPdf(peserta, profil, cardConfig)}
            className="dm-btn-primary !px-3 !py-1.5 !text-[12px]"
            title="Download format PDF (85.60 x 53.98 mm)"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const KartuPesertaPage: React.FC<KartuPesertaPageProps> = ({ profil }) => {
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => {
    return gasApi.getLocalPeserta().filter((p) => p.statusPeserta !== 'Deleted');
  });
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig>({
    theme: 'modern-navy',
    accentColor: '#0ea5e9',
    barcodeSize: 'large',
    showPhoto: true,
    showProgram: true,
    showWatermark: true,
    useCustomTemplate: false,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadingAll, setDownloadingAll] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      setIsSyncing(true);
      try {
        const [pRes, cfg] = await Promise.all([
          gasApi.getPeserta(),
          gasApi.getCardConfig(),
        ]);
        if (pRes.success && pRes.data) {
          setPesertaList(pRes.data.filter((p) => p.statusPeserta !== 'Deleted'));
        }
        setCardConfig(cfg);
      } catch (err) {
        console.error('Error loading cards:', err);
      } finally {
        setIsSyncing(false);
        setLoading(false);
      }
    };
    init();

    const handleSync = () => {
      init();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('peserta_updated', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('digitalmeera_sync');
        channel.onmessage = () => {
          init();
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('peserta_updated', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadAll = async () => {
    if (pesertaList.length === 0) return;
    setDownloadingAll(true);
    try {
      await downloadAllCardsPdf(pesertaList, profil, cardConfig);
      showToast('Semua kartu berhasil di-download dalam satu file PDF.');
    } catch (err) {
      console.error('Download all error', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const filtered = pesertaList.filter(
    (p) =>
      p.namaPeserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nomorMurid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Toast message={toastMessage} />

      <PageHeader
        title="Kartu Peserta"
        description="Ukuran ID-1 (85,60 × 53,98 mm), QR di kanan."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setIsSyncing(true);
                gasApi.getPeserta().then(res => {
                  if (res.success && res.data) setPesertaList(res.data.filter(p => p.statusPeserta !== 'Deleted'));
                  setIsSyncing(false);
                }).catch(() => setIsSyncing(false));
              }}
              disabled={isSyncing}
              className="dm-btn-secondary !py-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan…' : 'Segarkan'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloadingAll || pesertaList.length === 0}
              className="dm-btn-primary !py-2"
            >
              <Download className="h-4 w-4" />
              <span>{downloadingAll ? 'Menyiapkan…' : 'Unduh semua (PDF)'}</span>
            </button>
          </>
        }
      />

      {cardConfig.useCustomTemplate && cardConfig.templateImage && (
        <Card className="px-4 py-2.5 text-[12px] text-[#4b5a6a]">
          Menggunakan template latar kustom dari Pengaturan.
        </Card>
      )}

      <Card className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8494a5]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama atau nomor murid…"
            className="dm-input !pl-9"
          />
        </div>
      </Card>

      {(loading || (isSyncing && pesertaList.length === 0)) ? (
        <Card className="p-10 text-center text-[12px] text-[#8494a5]">
          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Memuat kartu…
        </Card>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((peserta) => (
            <StudentCardItem
              key={peserta.id}
              peserta={peserta}
              profil={profil}
              cardConfig={cardConfig}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<CreditCard className="h-5 w-5" />}
            title={searchTerm ? 'Tidak ada hasil' : 'Belum ada kartu'}
            description={searchTerm ? 'Ubah kata kunci.' : 'Daftarkan peserta untuk membuat kartu otomatis.'}
          />
        </Card>
      )}
    </div>
  );
};
