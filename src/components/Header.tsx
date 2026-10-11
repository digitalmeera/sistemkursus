import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { ProfilLembaga } from '../types';
import { gasApi } from '../services/gasApi';
import { BrandLogo } from './ui';

interface HeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
  profil: ProfilLembaga;
  adminName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onLogout,
  profil,
  adminName,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    setSyncFeedback('');
    try {
      const res = await gasApi.syncAll(true);
      if (res.success && res.data) {
        setSyncFeedback(`Tersinkron: ${res.data.peserta.length} siswa`);
        // Beri tahu halaman aktif sekali saja (aksi manual user — bukan loop).
        window.dispatchEvent(new CustomEvent('digitalmeera_synced'));
      } else {
        setSyncFeedback(res.message || 'Sinkronisasi selesai');
      }
    } catch (err: any) {
      setSyncFeedback('Gagal sinkron');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(''), 4000);
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#e3e9ef] bg-white px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-[#4b5a6a] hover:bg-[#f0f3f6] lg:hidden"
          title="Buka Menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <BrandLogo
            src={profil.logo}
            boxClassName="h-7 w-7 rounded border border-[#e3e9ef] bg-white"
          />
          <span className="hidden text-[13px] font-semibold text-[#1a2430] sm:inline">
            {profil.namaLembaga || 'DIGITALMEERA'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGlobalSync}
            disabled={isSyncing}
            className="dm-btn-secondary !py-1.5 !text-[12px]"
            title="Segarkan data dari Google Spreadsheet"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan…' : 'Segarkan'}</span>
          </button>
          {syncFeedback && (
            <span className="hidden text-[11px] font-medium text-[#1d6b3a] md:inline">
              {syncFeedback}
            </span>
          )}
        </div>

        <div className="hidden items-center gap-2 border border-[#e3e9ef] bg-[#f7f9fb] px-2.5 py-1.5 text-[12px] text-[#4b5a6a] lg:flex">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-semibold tabular-nums text-[#1a2430]">{currentTime}</span>
          <span>{currentDate}</span>
        </div>

        <div className="flex items-center gap-2 border-l border-[#e3e9ef] pl-2.5">
          <div className="hidden text-right text-[12px] xl:block">
            <p className="font-semibold leading-none text-[#1a2430]">{adminName || 'Admin'}</p>
            <p className="mt-0.5 text-[#8494a5]">Administrator</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#fdf0f0] hover:text-[#a02a2a]"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
